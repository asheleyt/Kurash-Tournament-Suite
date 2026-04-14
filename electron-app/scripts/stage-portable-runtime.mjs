import { spawnSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { platform } from 'os';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const runtimeRoot = join(repoRoot, 'electron-app', 'runtime-stage');
const phpRuntimeRoot = join(runtimeRoot, 'php');
const mariadbRuntimeRoot = join(runtimeRoot, 'mariadb');
const mariadbTemplateSource = join(repoRoot, 'portable', 'runtime', 'mariadb', 'my.ini.template');

const phpRequiredEntries = [
  'php.exe',
  'php.ini',
  join('ext', 'php_mbstring.dll'),
  join('ext', 'php_pdo_mysql.dll'),
  join('ext', 'php_mysqli.dll'),
  join('ext', 'php_openssl.dll'),
  join('ext', 'php_fileinfo.dll'),
];

const mariadbRequiredEntries = [
  join('bin', 'mysqld.exe'),
  join('bin', 'mysql.exe'),
  join('bin', 'mysqladmin.exe'),
  join('bin', 'mysql_install_db.exe'),
];

const mariadbDestinationRequiredEntries = [
  ...mariadbRequiredEntries,
  'my.ini.template',
];

const mariadbExcludedTopLevelEntries = new Set(['backup', 'data', 'data - Copy', 'data-old', 'logs', 'tmp']);

function normalizeRelativePath(targetPath) {
  return targetPath.replace(/\\/g, '/');
}

function missingEntries(root, requiredEntries) {
  return requiredEntries.filter((entry) => !existsSync(join(root, entry)));
}

function copyDirectory(sourceRoot, destinationRoot, options = {}) {
  const excludedTopLevelEntries = options.excludedTopLevelEntries || new Set();

  mkdirSync(destinationRoot, { recursive: true });

  if (platform() === 'win32') {
    const robocopyArgs = [
      sourceRoot,
      destinationRoot,
      '/E',
      '/R:2',
      '/W:2',
      '/COPY:DAT',
      '/NFL',
      '/NDL',
      '/NJH',
      '/NJS',
      '/NP',
    ];

    if (excludedTopLevelEntries.size > 0) {
      robocopyArgs.push('/XD', ...[...excludedTopLevelEntries].map((entryName) => join(sourceRoot, entryName)));
    }

    const result = spawnSync('robocopy', robocopyArgs, {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });

    const exitCode = typeof result.status === 'number' ? result.status : null;
    if (result.error || exitCode === null || exitCode >= 8) {
      const message = result.error?.message || result.stderr || result.stdout || 'robocopy failed';
      throw new Error(`[stage-portable-runtime] robocopy failed for ${sourceRoot} -> ${destinationRoot}: ${String(message).trim()}`);
    }

    return;
  }

  cpSync(sourceRoot, destinationRoot, {
    recursive: true,
    force: true,
    filter: (sourcePath) => {
      const normalizedRelative = normalizeRelativePath(relative(sourceRoot, sourcePath));
      if (!normalizedRelative || normalizedRelative === '') {
        return true;
      }

      const topLevelEntry = normalizedRelative.split('/')[0];
      return !excludedTopLevelEntries.has(topLevelEntry);
    },
  });
}

function describeCandidate(rootPath, missing) {
  if (!existsSync(rootPath)) {
    return 'path missing';
  }

  if (missing.length === 0) {
    return 'ready';
  }

  return `missing ${missing.join(', ')}`;
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const result = [];

  for (const candidate of candidates) {
    if (!candidate?.root) {
      continue;
    }

    const key = resolve(candidate.root).toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ ...candidate, root: resolve(candidate.root) });
  }

  return result;
}

function selectCandidate(kind, requiredEntries, candidates) {
  const diagnostics = [];

  for (const candidate of dedupeCandidates(candidates)) {
    const missing = missingEntries(candidate.root, requiredEntries);
    diagnostics.push({
      label: candidate.label,
      root: candidate.root,
      missing,
    });

    if (missing.length === 0) {
      return {
        selected: candidate,
        diagnostics,
      };
    }
  }

  console.error(`[stage-portable-runtime] Unable to find a complete ${kind} source.`);
  console.error(`[stage-portable-runtime] Checked candidate sources for ${kind}:`);
  for (const entry of diagnostics) {
    console.error(` - ${entry.label}: ${entry.root} (${describeCandidate(entry.root, entry.missing)})`);
  }

  return {
    selected: null,
    diagnostics,
  };
}

function stagePhpRuntime(sourceRoot) {
  copyDirectory(sourceRoot, phpRuntimeRoot);
}

function stageMariadbRuntime(sourceRoot) {
  copyDirectory(sourceRoot, mariadbRuntimeRoot, {
    excludedTopLevelEntries: mariadbExcludedTopLevelEntries,
  });
  ensureMariadbTemplate();
  pruneMariadbWritablePayloads();
}

function pruneMariadbWritablePayloads() {
  for (const entryName of mariadbExcludedTopLevelEntries) {
    const excludedPath = join(mariadbRuntimeRoot, entryName);
    if (existsSync(excludedPath)) {
      try {
        rmSync(excludedPath, { recursive: true, force: true });
      } catch (error) {
        if (platform() !== 'win32') {
          throw error;
        }

        const escapedPath = excludedPath.replace(/'/g, "''");
        const result = spawnSync(
          'powershell.exe',
          [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            `if (Test-Path -LiteralPath '${escapedPath}') { Remove-Item -LiteralPath '${escapedPath}' -Recurse -Force -ErrorAction Stop }`,
          ],
          {
            encoding: 'utf8',
            windowsHide: true,
            maxBuffer: 16 * 1024 * 1024,
          }
        );

        const exitCode = typeof result.status === 'number' ? result.status : null;
        if (result.error || exitCode !== 0) {
          const message = result.error?.message || result.stderr || result.stdout || String(error);
          throw new Error(`[stage-portable-runtime] Failed to remove excluded MariaDB payload ${excludedPath}: ${String(message).trim()}`);
        }
      }
    }
  }
}

function ensureMariadbTemplate() {
  const destinationTemplate = join(mariadbRuntimeRoot, 'my.ini.template');
  if (existsSync(destinationTemplate)) {
    return;
  }

  if (!existsSync(mariadbTemplateSource)) {
    console.error(`[stage-portable-runtime] Missing MariaDB template source: ${mariadbTemplateSource}`);
    process.exit(1);
  }

  mkdirSync(mariadbRuntimeRoot, { recursive: true });
  cpSync(mariadbTemplateSource, destinationTemplate, { force: true });
}

function assertRuntimeComplete() {
  const phpMissing = missingEntries(phpRuntimeRoot, phpRequiredEntries);
  const mariadbMissing = missingEntries(mariadbRuntimeRoot, mariadbDestinationRequiredEntries);
  const mariadbForbidden = [...mariadbExcludedTopLevelEntries].filter((entryName) =>
    existsSync(join(mariadbRuntimeRoot, entryName))
  );

  if (phpMissing.length > 0 || mariadbMissing.length > 0 || mariadbForbidden.length > 0) {
    console.error('[stage-portable-runtime] Portable runtime staging completed with missing files.');
    if (phpMissing.length > 0) {
      console.error(` - PHP runtime missing: ${phpMissing.join(', ')}`);
    }
    if (mariadbMissing.length > 0) {
      console.error(` - MariaDB runtime missing: ${mariadbMissing.join(', ')}`);
    }
    if (mariadbForbidden.length > 0) {
      console.error(` - MariaDB runtime includes writable payloads: ${mariadbForbidden.join(', ')}`);
    }
    process.exit(1);
  }
}

mkdirSync(runtimeRoot, { recursive: true });

let existingPhpMissing = missingEntries(phpRuntimeRoot, phpRequiredEntries);
let existingMariadbMissing = missingEntries(mariadbRuntimeRoot, mariadbDestinationRequiredEntries);
let existingMariadbForbidden = [...mariadbExcludedTopLevelEntries].filter((entryName) =>
  existsSync(join(mariadbRuntimeRoot, entryName))
);

if (existingMariadbForbidden.length > 0) {
  console.log('[stage-portable-runtime] Removing writable MariaDB payloads from the generated runtime bundle before reuse.');
  console.log(` - Entries: ${existingMariadbForbidden.join(', ')}`);
  pruneMariadbWritablePayloads();
  ensureMariadbTemplate();
  existingMariadbMissing = missingEntries(mariadbRuntimeRoot, mariadbDestinationRequiredEntries);
  existingMariadbForbidden = [...mariadbExcludedTopLevelEntries].filter((entryName) =>
    existsSync(join(mariadbRuntimeRoot, entryName))
  );
}

if (existingPhpMissing.length === 0 && existingMariadbMissing.length === 0 && existingMariadbForbidden.length === 0) {
  console.log('[stage-portable-runtime] The generated runtime bundle already contains a complete packaged runtime.');
  console.log(` - PHP runtime: ${phpRuntimeRoot}`);
  console.log(` - MariaDB runtime: ${mariadbRuntimeRoot}`);
  process.exit(0);
}

const phpCandidates = [
  process.env.KTS_PHP_SOURCE
    ? { label: 'KTS_PHP_SOURCE', root: process.env.KTS_PHP_SOURCE }
    : null,
  { label: 'repo portable/bin/php/xampp', root: join(repoRoot, 'portable', 'bin', 'php', 'xampp') },
  { label: 'repo portable/bin/php/php-8.3.30-Win32-vs16-x64', root: join(repoRoot, 'portable', 'bin', 'php', 'php-8.3.30-Win32-vs16-x64') },
  { label: 'local XAMPP PHP', root: 'C:\\xampp\\php' },
];

const mariadbCandidates = [
  process.env.KTS_MARIADB_SOURCE
    ? { label: 'KTS_MARIADB_SOURCE', root: process.env.KTS_MARIADB_SOURCE }
    : null,
  { label: 'repo portable/bin/mariadb/xampp', root: join(repoRoot, 'portable', 'bin', 'mariadb', 'xampp') },
  { label: 'repo portable/bin/mariadb/mysql-8.4.3-winx64', root: join(repoRoot, 'portable', 'bin', 'mariadb', 'mysql-8.4.3-winx64') },
  { label: 'local XAMPP MariaDB', root: 'C:\\xampp\\mysql' },
];

const phpSourceSelection =
  existingPhpMissing.length > 0
    ? selectCandidate('PHP runtime', phpRequiredEntries, phpCandidates)
    : { selected: null };
const mariadbSourceSelection =
  existingMariadbMissing.length > 0
    ? selectCandidate('MariaDB runtime', mariadbRequiredEntries, mariadbCandidates)
    : { selected: null };

const phpSource = phpSourceSelection.selected;
const mariadbSource = mariadbSourceSelection.selected;

if ((existingPhpMissing.length > 0 && !phpSource) || (existingMariadbMissing.length > 0 && !mariadbSource)) {
  console.error('[stage-portable-runtime] The generated runtime bundle remains incomplete. See portable/runtime/README.md for expected packaged layout.');
  process.exit(1);
}

console.log('[stage-portable-runtime] Staging deterministic portable runtime bundle.');
if (phpSource) {
  console.log(` - PHP source: ${phpSource.root}`);
}
if (mariadbSource) {
  console.log(` - MariaDB source: ${mariadbSource.root}`);
}
console.log(` - Destination: ${runtimeRoot}`);

if (phpSource) {
  stagePhpRuntime(phpSource.root);
}
if (mariadbSource) {
  stageMariadbRuntime(mariadbSource.root);
} else {
  pruneMariadbWritablePayloads();
}
assertRuntimeComplete();

console.log('[stage-portable-runtime] Portable runtime staging complete.');
console.log(` - PHP runtime: ${phpRuntimeRoot}`);
console.log(` - MariaDB runtime: ${mariadbRuntimeRoot}`);
