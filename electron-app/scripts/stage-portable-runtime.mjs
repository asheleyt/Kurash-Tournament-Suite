import { spawnSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { platform } from 'os';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const runtimeRoot = join(repoRoot, 'electron-app', 'runtime-stage');
const runtimeManifestPath = join(runtimeRoot, 'runtime-manifest.json');
const phpRuntimeRoot = join(runtimeRoot, 'php');
const mariadbRuntimeRoot = join(runtimeRoot, 'mariadb');
const mariadbTemplateSource = join(repoRoot, 'portable', 'runtime', 'mariadb', 'my.ini.template');

const approvedPhpSourceRoot = join(repoRoot, 'portable', 'bin', 'php', 'xampp');
const approvedMariaDbSourceRoot = join(repoRoot, 'portable', 'bin', 'mariadb', 'xampp');
const approvedPhpRuntimeDllSourceRoot = join(approvedMariaDbSourceRoot, 'bin');

const PHP_REQUIRED_MODULES = ['mbstring', 'pdo_mysql', 'mysqli', 'openssl', 'fileinfo'];
const PHP_REQUIRED_EXTENSION_DLLS = [
  'php_mbstring.dll',
  'php_pdo_mysql.dll',
  'php_mysqli.dll',
  'php_openssl.dll',
  'php_fileinfo.dll',
];
const PHP_REQUIRED_RUNTIME_DLLS = [
  'api-ms-win-crt-conio-l1-1-0.dll',
  'api-ms-win-crt-convert-l1-1-0.dll',
  'api-ms-win-crt-environment-l1-1-0.dll',
  'api-ms-win-crt-filesystem-l1-1-0.dll',
  'api-ms-win-crt-heap-l1-1-0.dll',
  'api-ms-win-crt-locale-l1-1-0.dll',
  'api-ms-win-crt-math-l1-1-0.dll',
  'api-ms-win-crt-multibyte-l1-1-0.dll',
  'api-ms-win-crt-private-l1-1-0.dll',
  'api-ms-win-crt-process-l1-1-0.dll',
  'api-ms-win-crt-runtime-l1-1-0.dll',
  'api-ms-win-crt-stdio-l1-1-0.dll',
  'api-ms-win-crt-string-l1-1-0.dll',
  'api-ms-win-crt-time-l1-1-0.dll',
  'api-ms-win-crt-utility-l1-1-0.dll',
  'concrt140.dll',
  'msvcp140.dll',
  'msvcp140_1.dll',
  'msvcp140_2.dll',
  'msvcp140_atomic_wait.dll',
  'msvcp140_codecvt_ids.dll',
  'ucrtbase.dll',
  'vcruntime140.dll',
  'vcruntime140_1.dll',
];
const phpExcludedTopLevelEntries = new Set([
  'CompatInfo',
  'data',
  'dev',
  'docs',
  'extras',
  'scripts',
  'tests',
  'windowsXamppPhp',
]);
const PHP_SOURCE_REQUIRED_ENTRIES = [
  'deplister.exe',
  'php.exe',
  'php.ini',
  'php8ts.dll',
  ...PHP_REQUIRED_EXTENSION_DLLS.map((entry) => join('ext', entry)),
];
const PHP_STAGED_REQUIRED_ENTRIES = [
  ...PHP_SOURCE_REQUIRED_ENTRIES,
  ...PHP_REQUIRED_RUNTIME_DLLS,
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
const dllNotFoundExitCodes = new Set([3221225781, 3221226505]);

function normalizeRelativePath(targetPath) {
  return targetPath.replace(/\\/g, '/');
}

function normalizeExitCode(exitCode) {
  if (typeof exitCode !== 'number') {
    return null;
  }

  return exitCode < 0 ? (0x100000000 + exitCode) : exitCode;
}

function summarizeOutput(value, maxLength = 500) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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

function copyFilesByName(sourceRoot, destinationRoot, fileNames) {
  mkdirSync(destinationRoot, { recursive: true });

  for (const fileName of fileNames) {
    const sourcePath = join(sourceRoot, fileName);
    const destinationPath = join(destinationRoot, fileName);

    if (!existsSync(sourcePath)) {
      throw new Error(`[stage-portable-runtime] Required runtime dependency is missing from ${sourceRoot}: ${fileName}`);
    }

    cpSync(sourcePath, destinationPath, { force: true });
  }
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

function runCommandCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });

  return {
    status: typeof result.status === 'number' ? result.status : null,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error || null,
  };
}

function diagnoseDependencyFailure(result) {
  const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}\n${result.error?.message || ''}`;
  const dependencyMatch = combinedOutput.match(
    /\b(vcruntime140(?:_1)?\.dll|msvcp140(?:_[\w]+)?\.dll|ucrtbase\.dll|api-ms-win-crt-[\w-]+\.dll)\b/i
  );
  const normalizedExitCode = normalizeExitCode(result.status);

  if (dependencyMatch) {
    return {
      reason: 'missing VC++ runtime dependency',
      dependency: dependencyMatch[1],
    };
  }

  if (dllNotFoundExitCodes.has(normalizedExitCode)) {
    return {
      reason: 'missing dependency DLL',
      dependency: null,
      exitCode: normalizedExitCode,
    };
  }

  return null;
}

function assertPhpCommandSucceeded(commandLabel, args, result) {
  const dependencyFailure = diagnoseDependencyFailure(result);
  if (!result.error && result.status === 0) {
    return;
  }

  const suffix = dependencyFailure
    ? `${dependencyFailure.reason}${dependencyFailure.dependency ? ` (${dependencyFailure.dependency})` : ''}`
    : summarizeOutput(result.stderr || result.stdout || result.error?.message || 'unknown PHP failure');

  console.error(`[stage-portable-runtime] ${commandLabel} failed: ${suffix}`);
  console.error(` - Command: ${join(phpRuntimeRoot, 'php.exe')} ${args.join(' ')}`);
  console.error(` - Exit code: ${result.status}`);
  process.exit(1);
}

function parsePhpModules(output) {
  return new Set(
    String(output || '')
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith('[') && !line.endsWith(']'))
  );
}

const PORTABLE_PHP_INI_TEMPLATE = 'php.ini-production';
const PORTABLE_PHP_UPLOAD_MAX_SIZE = '40M';
const PORTABLE_PHP_POST_MAX_SIZE = '40M';
const FORBIDDEN_PHP_INI_PATTERNS = [/C:\\xampp/i, /xampp\\php/i, /xampp\/php/i];

function findForbiddenPhpIniMatches(text) {
  const haystack = String(text || '');
  const matches = [];
  for (const pattern of FORBIDDEN_PHP_INI_PATTERNS) {
    const match = haystack.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

function buildPortablePhpIniFromProductionTemplate(templateText) {
  let text = String(templateText || '');

  // Ensure a portable extension directory that resolves inside the packaged PHP folder.
  const windowsExtensionDirLine = /^\s*;\s*extension_dir\s*=\s*"ext"\s*$/im;
  if (windowsExtensionDirLine.test(text)) {
    text = text.replace(windowsExtensionDirLine, 'extension_dir = "ext"');
  }
  if (!/^\s*extension_dir\s*=/im.test(text)) {
    text = `extension_dir = "ext"\n${text}`;
  }

  // Keep upload limits aligned with the prior XAMPP-based config.
  text = text.replace(/^\s*post_max_size\s*=.*$/im, `post_max_size = ${PORTABLE_PHP_POST_MAX_SIZE}`);
  text = text.replace(/^\s*upload_max_filesize\s*=.*$/im, `upload_max_filesize = ${PORTABLE_PHP_UPLOAD_MAX_SIZE}`);

  // Enable only the app-required extensions for the packaged runtime.
  const additions = [];
  for (const extensionName of PHP_REQUIRED_MODULES) {
    const commentedLine = new RegExp(`^\\s*;\\s*extension\\s*=\\s*${extensionName}\\s*(?:;.*)?$`, 'im');
    const enabledLine = new RegExp(`^\\s*extension\\s*=\\s*${extensionName}\\s*(?:;.*)?$`, 'im');

    if (commentedLine.test(text)) {
      text = text.replace(commentedLine, `extension=${extensionName}`);
      continue;
    }

    if (!enabledLine.test(text)) {
      additions.push(`extension=${extensionName}`);
    }
  }

  if (additions.length > 0) {
    text = `${text}\n\n; Added by Kurash portable runtime staging\n${additions.join('\n')}\n`;
  }

  // Ensure browscap is not enabled (portable runtime does not ship a browscap database).
  text = text.replace(/^\s*browscap\s*=.*$/im, ';browscap =');

  return text;
}

function writePortablePhpIni() {
  const templatePath = join(phpRuntimeRoot, PORTABLE_PHP_INI_TEMPLATE);
  const targetPath = join(phpRuntimeRoot, 'php.ini');

  if (!existsSync(templatePath)) {
    console.error(`[stage-portable-runtime] Missing PHP ini template (${PORTABLE_PHP_INI_TEMPLATE}) in staged runtime: ${templatePath}`);
    process.exit(1);
  }

  const templateText = readFileSync(templatePath, 'utf8');
  const portableText = buildPortablePhpIniFromProductionTemplate(templateText);

  const forbiddenMatches = findForbiddenPhpIniMatches(portableText);
  if (forbiddenMatches.length > 0) {
    console.error('[stage-portable-runtime] Generated portable php.ini still contains forbidden dev-machine paths:');
    for (const match of forbiddenMatches) {
      console.error(` - ${match}`);
    }
    process.exit(1);
  }

  const missingDirectives = [];
  if (!/^\s*extension_dir\s*=\s*"?ext"?\s*$/im.test(portableText)) {
    missingDirectives.push('extension_dir = "ext"');
  }
  for (const extensionName of PHP_REQUIRED_MODULES) {
    const enabledLine = new RegExp(`^\\s*extension\\s*=\\s*${extensionName}\\b`, 'im');
    if (!enabledLine.test(portableText)) {
      missingDirectives.push(`extension=${extensionName}`);
    }
  }
  if (missingDirectives.length > 0) {
    console.error('[stage-portable-runtime] Generated portable php.ini is missing required directives:');
    for (const directive of missingDirectives) {
      console.error(` - ${directive}`);
    }
    process.exit(1);
  }

  writeFileSync(targetPath, portableText, 'utf8');
}

function auditPhpDependencies() {
  const deplisterPath = join(phpRuntimeRoot, 'deplister.exe');
  const phpExe = join(phpRuntimeRoot, 'php.exe');

  if (!existsSync(deplisterPath)) {
    console.log('[stage-portable-runtime] PHP dependency audit skipped because deplister.exe is not present in the staged runtime.');
    return;
  }

  const auditResult = runCommandCapture(deplisterPath, [phpExe], {
    cwd: phpRuntimeRoot,
    env: process.env,
  });
  const combinedOutput = `${auditResult.stdout || ''}${auditResult.stderr || ''}`.trim();

  if (combinedOutput) {
    console.log('[stage-portable-runtime] PHP dependency audit output:');
    for (const line of combinedOutput.split(/\r?\n/)) {
      console.log(`   ${line}`);
    }
  }

  const unresolvedLines = combinedOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /,NOTFOUND$/i.test(line));
  const criticalUnresolved = unresolvedLines.filter((line) => !/^api-ms-win-crt-[\w-]+\.dll,NOTFOUND$/i.test(line));

  if (criticalUnresolved.length > 0) {
    console.error('[stage-portable-runtime] PHP dependency audit found unresolved non-UCRT DLL dependencies:');
    for (const line of criticalUnresolved) {
      console.error(` - ${line}`);
    }
    process.exit(1);
  }
}

function assertStagedPhpRuntimeLaunchable() {
  const phpExe = join(phpRuntimeRoot, 'php.exe');
  const targetIni = join(phpRuntimeRoot, 'php.ini');
  const phpEnv = {
    ...process.env,
    PHPRC: phpRuntimeRoot,
    PHP_INI_SCAN_DIR: '',
  };

  const assertPortableOutput = (label, result) => {
    const combinedOutput = `${result.stdout || ''}${result.stderr || ''}${result.error?.message || ''}`;

    const forbidden = findForbiddenPhpIniMatches(combinedOutput);
    if (forbidden.length > 0) {
      console.error(`[stage-portable-runtime] ${label} produced output that references forbidden XAMPP paths:`);
      for (const match of forbidden) {
        console.error(` - ${match}`);
      }
      console.error(` - Output: ${summarizeOutput(combinedOutput, 1500)}`);
      process.exit(1);
    }

    if (/\bPHP\s+(?:Warning|Fatal error):/i.test(combinedOutput) || /\bPHP\s+Startup:/i.test(combinedOutput)) {
      console.error(`[stage-portable-runtime] ${label} produced PHP startup/config warnings and staging must fail:`);
      console.error(` - Output: ${summarizeOutput(combinedOutput, 1500)}`);
      process.exit(1);
    }

    if (/\bUnable to load dynamic library\b/i.test(combinedOutput) || /\bUnable to start standard module\b/i.test(combinedOutput)) {
      console.error(`[stage-portable-runtime] ${label} indicates PHP extension resolution is broken:`);
      console.error(` - Output: ${summarizeOutput(combinedOutput, 1500)}`);
      process.exit(1);
    }
  };

  const versionResult = runCommandCapture(phpExe, ['-v'], {
    cwd: phpRuntimeRoot,
    env: phpEnv,
  });
  assertPhpCommandSucceeded('Staged PHP smoke test (-v)', ['-v'], versionResult);
  assertPortableOutput('Staged PHP smoke test (-v)', versionResult);

  const iniResult = runCommandCapture(phpExe, ['--ini'], {
    cwd: phpRuntimeRoot,
    env: phpEnv,
  });
  assertPhpCommandSucceeded('Staged PHP smoke test (--ini)', ['--ini'], iniResult);
  assertPortableOutput('Staged PHP smoke test (--ini)', iniResult);

  const iniStdout = String(iniResult.stdout || '');
  const loadedMatch = iniStdout.match(/^Loaded Configuration File:\s*(.+)$/im);
  const loadedPath = loadedMatch ? loadedMatch[1].trim() : '';
  if (!loadedPath || loadedPath.toLowerCase() === '(none)') {
    console.error('[stage-portable-runtime] Staged PHP did not load php.ini (Loaded Configuration File is missing/none).');
    console.error(` - Output: ${summarizeOutput(`${iniResult.stdout || ''}${iniResult.stderr || ''}`, 1500)}`);
    process.exit(1);
  }

  const expectedIniPath = normalizeRelativePath(resolve(targetIni)).toLowerCase();
  const actualIniPath = normalizeRelativePath(resolve(loadedPath)).toLowerCase();
  if (actualIniPath !== expectedIniPath) {
    console.error('[stage-portable-runtime] Staged PHP loaded an unexpected php.ini (portability validation failed).');
    console.error(` - Expected: ${expectedIniPath}`);
    console.error(` - Actual:   ${actualIniPath}`);
    console.error(` - Output: ${summarizeOutput(`${iniResult.stdout || ''}${iniResult.stderr || ''}`, 1500)}`);
    process.exit(1);
  }

  const scanMatch = iniStdout.match(/^Scan for additional \.ini files in:\s*(.+)$/im);
  if (scanMatch) {
    const scanPath = scanMatch[1].trim();
    if (scanPath && scanPath.toLowerCase() !== '(none)') {
      console.error('[stage-portable-runtime] Staged PHP is scanning additional ini directories (portability validation failed).');
      console.error(` - Scan path: ${scanPath}`);
      console.error(` - Output: ${summarizeOutput(`${iniResult.stdout || ''}${iniResult.stderr || ''}`, 1500)}`);
      process.exit(1);
    }
  }

  const modulesResult = runCommandCapture(phpExe, ['-m'], {
    cwd: phpRuntimeRoot,
    env: phpEnv,
  });
  assertPhpCommandSucceeded('Staged PHP smoke test (-m)', ['-m'], modulesResult);
  assertPortableOutput('Staged PHP smoke test (-m)', modulesResult);

  const loadedModules = parsePhpModules(modulesResult.stdout);
  const missingModules = PHP_REQUIRED_MODULES.filter((moduleName) => !loadedModules.has(moduleName));
  if (missingModules.length > 0) {
    console.error('[stage-portable-runtime] Staged PHP runtime launched, but required modules are missing:');
    console.error(` - Missing modules: ${missingModules.join(', ')}`);
    process.exit(1);
  }

  auditPhpDependencies();
}

function stagePhpRuntime(sourceRoot) {
  copyDirectory(sourceRoot, phpRuntimeRoot, {
    excludedTopLevelEntries: phpExcludedTopLevelEntries,
  });
}

function stagePhpRuntimeDlls(sourceRoot) {
  copyFilesByName(sourceRoot, phpRuntimeRoot, PHP_REQUIRED_RUNTIME_DLLS);
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
    if (!existsSync(excludedPath)) {
      continue;
    }

    rmSync(excludedPath, { recursive: true, force: true });
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

function writeRuntimeManifest({ phpSource, mariadbSource, phpRuntimeDllSource, phpSourceDiagnostics, mariadbSourceDiagnostics, phpRuntimeDllSourceDiagnostics }) {
  writeFileSync(
    runtimeManifestPath,
    JSON.stringify(
      {
        rebuiltAt: new Date().toISOString(),
        rebuildMode: 'fresh',
        destination: runtimeRoot,
        phpSource,
        mariadbSource,
        phpRuntimeDllSource,
        requiredPhpModules: PHP_REQUIRED_MODULES,
        requiredPhpRuntimeDlls: PHP_REQUIRED_RUNTIME_DLLS,
        requiredPhpEntries: PHP_STAGED_REQUIRED_ENTRIES,
        excludedPhpTopLevelEntries: [...phpExcludedTopLevelEntries],
        requiredMariadbEntries: mariadbDestinationRequiredEntries,
        phpSourceDiagnostics,
        mariadbSourceDiagnostics,
        phpRuntimeDllSourceDiagnostics,
      },
      null,
      2
    ),
    'utf8'
  );
}

function assertRuntimeComplete() {
  const phpMissing = missingEntries(phpRuntimeRoot, PHP_STAGED_REQUIRED_ENTRIES);
  const mariadbMissing = missingEntries(mariadbRuntimeRoot, mariadbDestinationRequiredEntries);
  const phpForbidden = [...phpExcludedTopLevelEntries].filter((entryName) =>
    existsSync(join(phpRuntimeRoot, entryName))
  );
  const mariadbForbidden = [...mariadbExcludedTopLevelEntries].filter((entryName) =>
    existsSync(join(mariadbRuntimeRoot, entryName))
  );

  if (phpMissing.length > 0 || mariadbMissing.length > 0 || phpForbidden.length > 0 || mariadbForbidden.length > 0) {
    console.error('[stage-portable-runtime] Portable runtime staging completed with missing or forbidden files.');
    if (phpMissing.length > 0) {
      console.error(` - PHP runtime missing: ${phpMissing.join(', ')}`);
    }
    if (phpForbidden.length > 0) {
      console.error(` - PHP runtime includes excluded duplicate payloads: ${phpForbidden.join(', ')}`);
    }
    if (mariadbMissing.length > 0) {
      console.error(` - MariaDB runtime missing: ${mariadbMissing.join(', ')}`);
    }
    if (mariadbForbidden.length > 0) {
      console.error(` - MariaDB runtime includes writable payloads: ${mariadbForbidden.join(', ')}`);
    }
    process.exit(1);
  }

  assertStagedPhpRuntimeLaunchable();
}

function rebuildRuntimeStage() {
  if (existsSync(runtimeRoot)) {
    rmSync(runtimeRoot, { recursive: true, force: true });
  }
  mkdirSync(runtimeRoot, { recursive: true });
}

const phpCandidates = [
  process.env.KTS_PHP_SOURCE
    ? { label: 'KTS_PHP_SOURCE', root: process.env.KTS_PHP_SOURCE }
    : null,
  { label: 'repo portable/bin/php/xampp', root: approvedPhpSourceRoot },
];

const mariadbCandidates = [
  process.env.KTS_MARIADB_SOURCE
    ? { label: 'KTS_MARIADB_SOURCE', root: process.env.KTS_MARIADB_SOURCE }
    : null,
  { label: 'repo portable/bin/mariadb/xampp', root: approvedMariaDbSourceRoot },
];

const phpRuntimeDllCandidates = [
  process.env.KTS_VC_RUNTIME_SOURCE
    ? { label: 'KTS_VC_RUNTIME_SOURCE', root: process.env.KTS_VC_RUNTIME_SOURCE }
    : null,
  { label: 'repo portable/bin/mariadb/xampp/bin', root: approvedPhpRuntimeDllSourceRoot },
];

console.log('[stage-portable-runtime] Release build will rebuild runtime-stage from approved runtime sources.');
console.log(` - Destination: ${runtimeRoot}`);

rebuildRuntimeStage();

const phpSourceSelection = selectCandidate('PHP runtime', PHP_SOURCE_REQUIRED_ENTRIES, phpCandidates);
const mariadbSourceSelection = selectCandidate('MariaDB runtime', mariadbRequiredEntries, mariadbCandidates);
const phpRuntimeDllSourceSelection = selectCandidate(
  'PHP VC runtime DLL set',
  PHP_REQUIRED_RUNTIME_DLLS,
  phpRuntimeDllCandidates
);

const phpSource = phpSourceSelection.selected;
const mariadbSource = mariadbSourceSelection.selected;
const phpRuntimeDllSource = phpRuntimeDllSourceSelection.selected;

if (!phpSource || !mariadbSource || !phpRuntimeDllSource) {
  console.error('[stage-portable-runtime] Runtime staging aborted because one or more approved runtime sources are incomplete.');
  console.error('[stage-portable-runtime] Fix the repo-local runtime caches or provide explicit KTS_* overrides for this build.');
  process.exit(1);
}

console.log('[stage-portable-runtime] Selected runtime sources:');
console.log(` - PHP source: ${phpSource.root}`);
console.log(` - MariaDB source: ${mariadbSource.root}`);
console.log(` - PHP VC runtime DLL source: ${phpRuntimeDllSource.root}`);

stagePhpRuntime(phpSource.root);
writePortablePhpIni();
stageMariadbRuntime(mariadbSource.root);
stagePhpRuntimeDlls(phpRuntimeDllSource.root);
assertRuntimeComplete();
writeRuntimeManifest({
  phpSource: phpSource.root,
  mariadbSource: mariadbSource.root,
  phpRuntimeDllSource: phpRuntimeDllSource.root,
  phpSourceDiagnostics: phpSourceSelection.diagnostics,
  mariadbSourceDiagnostics: mariadbSourceSelection.diagnostics,
  phpRuntimeDllSourceDiagnostics: phpRuntimeDllSourceSelection.diagnostics,
});

console.log('[stage-portable-runtime] Portable runtime staging complete.');
console.log(' - Rebuild mode: fresh');
console.log(` - PHP runtime: ${phpRuntimeRoot}`);
console.log(` - MariaDB runtime: ${mariadbRuntimeRoot}`);
console.log(` - Runtime manifest: ${runtimeManifestPath}`);
