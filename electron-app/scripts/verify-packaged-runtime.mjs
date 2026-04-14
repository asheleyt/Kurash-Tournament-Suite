import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const electronAppDir = join(repoRoot, 'electron-app');
const packageJsonPath = join(electronAppDir, 'package.json');
const electronPackage = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const outputRoot = join(electronAppDir, 'build-output', 'win-unpacked');
const resourcesRoot = join(outputRoot, 'resources');
const laravelRoot = join(resourcesRoot, 'laravel');
const portableRuntimeRoot = join(resourcesRoot, 'portable', 'runtime');
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
  { label: 'packaged PHP executable', target: packagedPhpExe },
  { label: 'packaged php.ini', target: join(packagedPhpRoot, 'php.ini') },
  { label: 'packaged PHP ext folder', target: join(packagedPhpRoot, 'ext') },
  { label: 'packaged php_mbstring.dll', target: join(packagedPhpRoot, 'ext', 'php_mbstring.dll') },
  { label: 'packaged php_pdo_mysql.dll', target: join(packagedPhpRoot, 'ext', 'php_pdo_mysql.dll') },
  { label: 'packaged php_mysqli.dll', target: join(packagedPhpRoot, 'ext', 'php_mysqli.dll') },
  { label: 'packaged php_openssl.dll', target: join(packagedPhpRoot, 'ext', 'php_openssl.dll') },
  { label: 'packaged php_fileinfo.dll', target: join(packagedPhpRoot, 'ext', 'php_fileinfo.dll') },
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
  { label: 'bundled MariaDB backup payload', target: join(packagedMariaDbRoot, 'backup') },
  { label: 'bundled MariaDB data-old payload', target: join(packagedMariaDbRoot, 'data-old') },
  { label: 'bundled MariaDB tmp payload', target: join(packagedMariaDbRoot, 'tmp') },
];

function summarizeOutput(value, maxLength = 500) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function runCommandCheck({ label, command, args, expectedPattern }) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });

  const combinedOutput = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error || result.status !== 0) {
    return {
      label,
      command,
      args,
      exitCode: typeof result.status === 'number' ? result.status : null,
      error: result.error ? result.error.message : summarizeOutput(combinedOutput),
    };
  }

  if (expectedPattern && !expectedPattern.test(combinedOutput)) {
    return {
      label,
      command,
      args,
      exitCode: typeof result.status === 'number' ? result.status : null,
      error: `Unexpected output: ${summarizeOutput(combinedOutput)}`,
    };
  }

  return null;
}

const missing = requiredChecks.filter((check) => !existsSync(check.target));
const forbidden = forbiddenChecks.filter((check) => existsSync(check.target));
const iconConfig = electronPackage.build?.win?.icon || null;
const runtimeExecutableChecks = missing.length === 0 ? [
  {
    label: 'packaged PHP executable smoke test',
    command: packagedPhpExe,
    args: ['-v'],
    expectedPattern: /\bPHP\s+\d/i,
  },
  {
    label: 'packaged MariaDB mysqld.exe smoke test',
    command: packagedMysqldExe,
    args: ['--version'],
    expectedPattern: /\bMariaDB\b/i,
  },
  {
    label: 'packaged MariaDB mysql.exe smoke test',
    command: packagedMysqlExe,
    args: ['--version'],
    expectedPattern: /\b(MariaDB|Distrib)\b/i,
  },
  {
    label: 'packaged MariaDB mysqladmin.exe smoke test',
    command: packagedMysqlAdminExe,
    args: ['--version'],
    expectedPattern: /\b(MariaDB|Distrib)\b/i,
  },
  {
    label: 'packaged MariaDB mysql_install_db.exe smoke test',
    command: packagedMysqlInstallDbExe,
    args: ['--help'],
    expectedPattern: /Usage:/i,
  },
] : [];
const runtimeExecutionFailures = runtimeExecutableChecks
  .map((check) => runCommandCheck(check))
  .filter(Boolean);

if (!iconConfig) {
  missing.push({ label: 'electron-builder win.icon config', target: '(missing in electron-app/package.json)' });
}

if (missing.length > 0 || forbidden.length > 0 || runtimeExecutionFailures.length > 0) {
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

  if (runtimeExecutionFailures.length > 0) {
    console.error('[verify-packaged-runtime] Packaged runtime executables failed smoke tests:');
    for (const item of runtimeExecutionFailures) {
      console.error(` - ${item.label}: ${item.command} ${item.args.join(' ')} -> ${item.error}`);
    }
  }

  process.exit(1);
}

console.log('[verify-packaged-runtime] Packaged runtime verification passed, including executable smoke tests.');
console.log(` - Laravel root: ${laravelRoot}`);
console.log(` - Laravel storage seed: ${packagedStorageSeedRoot}`);
console.log(` - PHP runtime: ${packagedPhpExe}`);
console.log(` - MariaDB runtime: ${packagedMysqldExe}`);
console.log(` - Icon: ${sourceIcon}`);
console.log(` - NSIS installer icon: ${nsisInstallerIcon}`);
