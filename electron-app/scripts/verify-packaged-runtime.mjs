import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const electronAppDir = join(repoRoot, 'electron-app');
const packageJsonPath = join(electronAppDir, 'package.json');
const electronPackage = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const PHP_REQUIRED_MODULES = ['mbstring', 'pdo_mysql', 'mysqli', 'openssl', 'fileinfo'];
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
const dllNotFoundExitCodes = new Set([3221225781, 3221226505]);

const FORBIDDEN_PORTABLE_PATTERNS = [/C:\\xampp/i, /xampp\\php/i, /xampp\/php/i];

function findForbiddenPortableMatches(text) {
  const haystack = String(text || '');
  const matches = [];
  for (const pattern of FORBIDDEN_PORTABLE_PATTERNS) {
    const match = haystack.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

function validatePortablePhpOutput(stdout, stderr) {
  const combined = `${stdout || ''}${stderr || ''}`;
  const forbidden = findForbiddenPortableMatches(combined);
  if (forbidden.length > 0) {
    return `Output references forbidden dev-machine paths (${forbidden.join(', ')}): ${summarizeOutput(combined, 800)}`;
  }

  if (/\bPHP\s+(?:Warning|Fatal error):/i.test(combined) || /\bPHP\s+Startup:/i.test(combined)) {
    return `PHP startup/config warnings present: ${summarizeOutput(combined, 800)}`;
  }

  if (/\bUnable to load dynamic library\b/i.test(combined) || /\bUnable to start standard module\b/i.test(combined)) {
    return `PHP extension resolution failed: ${summarizeOutput(combined, 800)}`;
  }

  return null;
}

function normalizePathForCompare(targetPath) {
  return String(targetPath || '').replace(/\\/g, '/').trim().toLowerCase();
}

function normalizeEnabledExtensionName(rawValue) {
  const value = String(rawValue || '').trim().replace(/^"|"$/g, '');
  if (!value) return '';

  const lower = value.toLowerCase();
  if (lower.endsWith('.dll')) {
    return lower.replace(/^php_/, '').replace(/\.dll$/, '');
  }

  return lower;
}

function validatePhpIniPortability(phpIniPath) {
  const text = readFileSync(phpIniPath, 'utf8');
  const failures = [];

  const forbidden = findForbiddenPortableMatches(text);
  if (forbidden.length > 0) {
    failures.push(`php.ini contains forbidden dev-machine paths: ${forbidden.join(', ')}`);
  }

  if (!/^\s*extension_dir\s*=\s*"?ext"?\s*$/im.test(text)) {
    failures.push('php.ini must set extension_dir to "ext"');
  }

  const enabledExtensions = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

    if (/^browscap\s*=/i.test(trimmed)) {
      failures.push('php.ini enables browscap (must be disabled for portable runtime)');
    }

    const extensionMatch = trimmed.match(/^extension\s*=\s*([^;#]+)$/i);
    if (extensionMatch) {
      const normalized = normalizeEnabledExtensionName(extensionMatch[1]);
      if (normalized) {
        enabledExtensions.push(normalized);
      }
    }
  }

  const allowed = new Set(PHP_REQUIRED_MODULES.map((name) => name.toLowerCase()));
  const unexpected = enabledExtensions.filter((name) => !allowed.has(name));
  if (unexpected.length > 0) {
    failures.push(`php.ini enables unexpected extensions: ${unexpected.join(', ')}`);
  }

  const missing = PHP_REQUIRED_MODULES.filter((name) => !enabledExtensions.includes(name.toLowerCase()));
  if (missing.length > 0) {
    failures.push(`php.ini is missing required extension directives: ${missing.join(', ')}`);
  }

  return failures;
}

const outputRoot = join(electronAppDir, 'build-output', 'win-unpacked');
const resourcesRoot = join(outputRoot, 'resources');
const laravelRoot = join(resourcesRoot, 'laravel');
const portableRuntimeRoot = join(resourcesRoot, 'portable', 'runtime');
const runtimeManifestPath = join(portableRuntimeRoot, 'runtime-manifest.json');
const packagedPhpRoot = join(portableRuntimeRoot, 'php');
const packagedMariaDbRoot = join(portableRuntimeRoot, 'mariadb');
const packagedStorageSeedRoot = join(laravelRoot, 'storage-seed', 'app');
const sourceIcon = resolve(electronAppDir, electronPackage.build?.win?.icon || '../public/app-icon.ico');
const nsisInstallerIcon = resolve(
  electronAppDir,
  electronPackage.build?.nsis?.installerIcon || electronPackage.build?.win?.icon || '../public/app-icon.ico'
);
const nsisUninstallerIcon = resolve(
  electronAppDir,
  electronPackage.build?.nsis?.uninstallerIcon || electronPackage.build?.win?.icon || '../public/app-icon.ico'
);
const packagedPhpExe = join(packagedPhpRoot, 'php.exe');
const packagedMariaDbBinRoot = join(packagedMariaDbRoot, 'bin');
const packagedMysqldExe = join(packagedMariaDbBinRoot, 'mysqld.exe');
const packagedMysqlExe = join(packagedMariaDbBinRoot, 'mysql.exe');
const packagedMysqlAdminExe = join(packagedMariaDbBinRoot, 'mysqladmin.exe');
const packagedMysqlInstallDbExe = join(packagedMariaDbBinRoot, 'mysql_install_db.exe');

const requiredChecks = [
  { label: 'win-unpacked output', target: outputRoot },
  { label: 'packaged app.asar', target: join(resourcesRoot, 'app.asar') },
  { label: 'packaged Laravel folder', target: laravelRoot },
  { label: 'packaged Laravel public/build', target: join(laravelRoot, 'public', 'build') },
  { label: 'packaged Laravel storage seed', target: packagedStorageSeedRoot },
  { label: 'packaged runtime manifest', target: runtimeManifestPath },
  { label: 'packaged PHP executable', target: packagedPhpExe },
  { label: 'packaged php.ini', target: join(packagedPhpRoot, 'php.ini') },
  { label: 'packaged PHP ext folder', target: join(packagedPhpRoot, 'ext') },
  { label: 'packaged php_mbstring.dll', target: join(packagedPhpRoot, 'ext', 'php_mbstring.dll') },
  { label: 'packaged php_pdo_mysql.dll', target: join(packagedPhpRoot, 'ext', 'php_pdo_mysql.dll') },
  { label: 'packaged php_mysqli.dll', target: join(packagedPhpRoot, 'ext', 'php_mysqli.dll') },
  { label: 'packaged php_openssl.dll', target: join(packagedPhpRoot, 'ext', 'php_openssl.dll') },
  { label: 'packaged php_fileinfo.dll', target: join(packagedPhpRoot, 'ext', 'php_fileinfo.dll') },
  ...PHP_REQUIRED_RUNTIME_DLLS.map((dllName) => ({
    label: `packaged PHP runtime DLL ${dllName}`,
    target: join(packagedPhpRoot, dllName),
  })),
  { label: 'packaged MariaDB mysqld.exe', target: packagedMysqldExe },
  { label: 'packaged MariaDB mysql.exe', target: packagedMysqlExe },
  { label: 'packaged MariaDB mysqladmin.exe', target: packagedMysqlAdminExe },
  { label: 'packaged MariaDB mysql_install_db.exe', target: packagedMysqlInstallDbExe },
  { label: 'packaged MariaDB config template', target: join(packagedMariaDbRoot, 'my.ini.template') },
  { label: 'production icon source', target: sourceIcon },
  { label: 'nsis installer icon source', target: nsisInstallerIcon },
  { label: 'nsis uninstaller icon source', target: nsisUninstallerIcon },
  { label: 'splash asset source', target: join(electronAppDir, 'splash.html') },
  { label: 'error asset source', target: join(electronAppDir, 'error.html') },
  { label: 'preload asset source', target: join(electronAppDir, 'preload.js') },
  { label: 'runtime orchestrator source', target: join(electronAppDir, 'runtime-orchestrator.js') },
];

const forbiddenChecks = [
  { label: 'legacy portable bin payload', target: join(resourcesRoot, 'portable', 'bin') },
  { label: 'bundled writable storage framework cache', target: join(laravelRoot, 'storage', 'framework') },
  { label: 'bundled writable storage logs', target: join(laravelRoot, 'storage', 'logs') },
  { label: 'bundled MariaDB data payload', target: join(packagedMariaDbRoot, 'data') },
  { label: 'bundled MariaDB copied data payload', target: join(packagedMariaDbRoot, 'data - Copy') },
  { label: 'bundled MariaDB backup payload', target: join(packagedMariaDbRoot, 'backup') },
  { label: 'bundled MariaDB data-old payload', target: join(packagedMariaDbRoot, 'data-old') },
  { label: 'bundled MariaDB tmp payload', target: join(packagedMariaDbRoot, 'tmp') },
];

function summarizeOutput(value, maxLength = 500) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeExitCode(exitCode) {
  if (typeof exitCode !== 'number') {
    return null;
  }

  return exitCode < 0 ? (0x100000000 + exitCode) : exitCode;
}

function diagnoseDependencyFailure(result) {
  const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}\n${result.error?.message || ''}`;
  const dependencyMatch = combinedOutput.match(
    /\b(vcruntime140(?:_1)?\.dll|msvcp140(?:_[\w]+)?\.dll|ucrtbase\.dll|api-ms-win-crt-[\w-]+\.dll)\b/i
  );
  const normalizedExitCode = normalizeExitCode(result.status);

  if (dependencyMatch) {
    return `${dependencyMatch[1]} missing`;
  }

  if (dllNotFoundExitCodes.has(normalizedExitCode)) {
    return `dependency DLL missing (exit code ${normalizedExitCode})`;
  }

  return null;
}

function parsePhpModules(output) {
  return new Set(
    String(output || '')
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith('[') && !line.endsWith(']'))
  );
}

function runCommandCheck({ label, command, args, env, validateOutput }) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    env,
  });

  const combinedOutput = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error || result.status !== 0) {
    const dependencyFailure = diagnoseDependencyFailure({
      status: typeof result.status === 'number' ? result.status : null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error || null,
    });

    return {
      label,
      command,
      args,
      exitCode: typeof result.status === 'number' ? result.status : null,
      error: dependencyFailure || result.error?.message || summarizeOutput(combinedOutput),
    };
  }

  if (typeof validateOutput === 'function') {
    const validationError = validateOutput(result.stdout || '', result.stderr || '', result);
    if (validationError) {
      return {
        label,
        command,
        args,
        exitCode: typeof result.status === 'number' ? result.status : null,
        error: validationError,
      };
    }
  }

  return null;
}

function validateRuntimeManifest() {
  if (!existsSync(runtimeManifestPath)) {
    return ['runtime manifest is missing'];
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(runtimeManifestPath, 'utf8'));
  } catch (error) {
    return [`runtime manifest is unreadable: ${error.message}`];
  }

  const failures = [];
  if (manifest.rebuildMode !== 'fresh') {
    failures.push(`runtime manifest rebuildMode must be "fresh", got ${JSON.stringify(manifest.rebuildMode)}`);
  }
  if (!manifest.phpSource) {
    failures.push('runtime manifest is missing phpSource');
  }
  if (!manifest.mariadbSource) {
    failures.push('runtime manifest is missing mariadbSource');
  }
  if (!manifest.phpRuntimeDllSource) {
    failures.push('runtime manifest is missing phpRuntimeDllSource');
  }

  const manifestDlls = Array.isArray(manifest.requiredPhpRuntimeDlls) ? [...manifest.requiredPhpRuntimeDlls].sort() : [];
  const expectedDlls = [...PHP_REQUIRED_RUNTIME_DLLS].sort();
  if (manifestDlls.length !== expectedDlls.length || manifestDlls.some((entry, index) => entry !== expectedDlls[index])) {
    failures.push('runtime manifest requiredPhpRuntimeDlls does not match the expected packaged DLL manifest');
  }

  return failures;
}

const missing = requiredChecks.filter((check) => !existsSync(check.target));
const forbidden = forbiddenChecks.filter((check) => existsSync(check.target));
const manifestFailures = missing.length === 0 ? validateRuntimeManifest() : [];
const iconConfig = electronPackage.build?.win?.icon || null;
const packagedPhpIniPath = join(packagedPhpRoot, 'php.ini');
const phpIniPortabilityFailures = existsSync(packagedPhpIniPath) ? validatePhpIniPortability(packagedPhpIniPath) : [];
const phpEnv = {
  ...process.env,
  PHPRC: packagedPhpRoot,
  PHP_INI_SCAN_DIR: '',
};
const runtimeExecutableChecks = missing.length === 0 ? [
  {
    label: 'packaged PHP executable smoke test (-v)',
    command: packagedPhpExe,
    args: ['-v'],
    env: phpEnv,
    validateOutput: (stdout, stderr) => {
      const portabilityError = validatePortablePhpOutput(stdout, stderr);
      if (portabilityError) return portabilityError;
      return /\bPHP\s+\d/i.test(stdout) ? null : `Unexpected output: ${summarizeOutput(`${stdout}${stderr}`)}`;
    },
  },
  {
    label: 'packaged PHP executable smoke test (--ini)',
    command: packagedPhpExe,
    args: ['--ini'],
    env: phpEnv,
    validateOutput: (stdout, stderr) => {
      const portabilityError = validatePortablePhpOutput(stdout, stderr);
      if (portabilityError) return portabilityError;

      if (!/Loaded Configuration File/i.test(stdout)) {
        return `Unexpected output: ${summarizeOutput(`${stdout}${stderr}`)}`;
      }

      const loadedMatch = String(stdout || '').match(/^Loaded Configuration File:\s*(.+)$/im);
      const loadedPath = loadedMatch ? loadedMatch[1].trim() : '';
      if (!loadedPath || loadedPath.toLowerCase() === '(none)') {
        return `Loaded Configuration File is missing/none: ${summarizeOutput(`${stdout}${stderr}`)}`;
      }

      const expectedIni = normalizePathForCompare(resolve(packagedPhpIniPath));
      const actualIni = normalizePathForCompare(resolve(loadedPath));
      if (actualIni !== expectedIni) {
        return `Loaded Configuration File mismatch (expected ${expectedIni}, got ${actualIni})`;
      }

      const scanMatch = String(stdout || '').match(/^Scan for additional \.ini files in:\s*(.+)$/im);
      if (scanMatch) {
        const scanPath = scanMatch[1].trim();
        if (scanPath && scanPath.toLowerCase() !== '(none)') {
          return `PHP is scanning additional ini files (${scanPath})`;
        }
      }

      return null;
    },
  },
  {
    label: 'packaged PHP executable smoke test (-m)',
    command: packagedPhpExe,
    args: ['-m'],
    env: phpEnv,
    validateOutput: (stdout, stderr) => {
      const portabilityError = validatePortablePhpOutput(stdout, stderr);
      if (portabilityError) return portabilityError;

      const loadedModules = parsePhpModules(stdout);
      const missingModules = PHP_REQUIRED_MODULES.filter((moduleName) => !loadedModules.has(moduleName));
      return missingModules.length > 0 ? `Missing PHP modules: ${missingModules.join(', ')}` : null;
    },
  },
  {
    label: 'packaged MariaDB mysqld.exe smoke test',
    command: packagedMysqldExe,
    args: ['--version'],
    expectedPattern: /\bMariaDB\b/i,
    validateOutput: (stdout, stderr) => (/\bMariaDB\b/i.test(`${stdout}${stderr}`) ? null : `Unexpected output: ${summarizeOutput(`${stdout}${stderr}`)}`),
  },
  {
    label: 'packaged MariaDB mysql.exe smoke test',
    command: packagedMysqlExe,
    args: ['--version'],
    validateOutput: (stdout, stderr) => (/\b(MariaDB|Distrib)\b/i.test(`${stdout}${stderr}`) ? null : `Unexpected output: ${summarizeOutput(`${stdout}${stderr}`)}`),
  },
  {
    label: 'packaged MariaDB mysqladmin.exe smoke test',
    command: packagedMysqlAdminExe,
    args: ['--version'],
    validateOutput: (stdout, stderr) => (/\b(MariaDB|Distrib)\b/i.test(`${stdout}${stderr}`) ? null : `Unexpected output: ${summarizeOutput(`${stdout}${stderr}`)}`),
  },
  {
    label: 'packaged MariaDB mysql_install_db.exe smoke test',
    command: packagedMysqlInstallDbExe,
    args: ['--help'],
    validateOutput: (stdout, stderr) => (/Usage:/i.test(`${stdout}${stderr}`) ? null : `Unexpected output: ${summarizeOutput(`${stdout}${stderr}`)}`),
  },
] : [];
const runtimeExecutionFailures = runtimeExecutableChecks
  .map((check) => runCommandCheck(check))
  .filter(Boolean);

if (!iconConfig) {
  missing.push({ label: 'electron-builder win.icon config', target: '(missing in electron-app/package.json)' });
}

if (missing.length > 0 || forbidden.length > 0 || manifestFailures.length > 0 || phpIniPortabilityFailures.length > 0 || runtimeExecutionFailures.length > 0) {
  if (missing.length > 0) {
    console.error('[verify-packaged-runtime] Missing required packaged runtime assets:');
    for (const item of missing) {
      console.error(` - ${item.label}: ${item.target}`);
    }
  }

  if (forbidden.length > 0) {
    console.error('[verify-packaged-runtime] Found forbidden legacy or writable packaged assets:');
    for (const item of forbidden) {
      console.error(` - ${item.label}: ${item.target}`);
    }
  }

  if (manifestFailures.length > 0) {
    console.error('[verify-packaged-runtime] Runtime manifest validation failed:');
    for (const failure of manifestFailures) {
      console.error(` - ${failure}`);
    }
  }

  if (phpIniPortabilityFailures.length > 0) {
    console.error('[verify-packaged-runtime] Packaged php.ini portability validation failed:');
    for (const failure of phpIniPortabilityFailures) {
      console.error(` - ${failure}`);
    }
  }

  if (runtimeExecutionFailures.length > 0) {
    console.error('[verify-packaged-runtime] Packaged runtime executables failed smoke tests:');
    for (const item of runtimeExecutionFailures) {
      console.error(` - ${item.label}: ${item.command} ${item.args.join(' ')} -> ${item.error}`);
    }
  }

  process.exit(1);
}

console.log('[verify-packaged-runtime] Packaged runtime verification passed, including DLL manifest and executable smoke tests.');
console.log(` - Runtime manifest: ${runtimeManifestPath}`);
console.log(` - Laravel root: ${laravelRoot}`);
console.log(` - Laravel storage seed: ${packagedStorageSeedRoot}`);
console.log(` - PHP runtime: ${packagedPhpExe}`);
console.log(` - MariaDB runtime: ${packagedMysqldExe}`);
console.log(` - Icon: ${sourceIcon}`);
console.log(` - NSIS installer icon: ${nsisInstallerIcon}`);
