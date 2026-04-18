import { spawnSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { dirname, join, parse, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronAppDir = resolve(__dirname, '..');
const packageJsonPath = join(electronAppDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const buildOutputDir = join(electronAppDir, 'build-output');
const electronBuilderCli = join(electronAppDir, 'node_modules', 'electron-builder', 'cli.js');

process.env.CSC_IDENTITY_AUTO_DISCOVERY = process.env.CSC_IDENTITY_AUTO_DISCOVERY || 'false';

function writeProcessResult(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function runElectronBuilder() {
  const result = spawnSync(process.execPath, [electronBuilderCli, '--win', 'nsis'], {
    cwd: electronAppDir,
    env: process.env,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });

  writeProcessResult(result);
  return result;
}

function isMissingUninstallerRace(result) {
  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  return combined.includes('__uninstaller.exe" -> no files found');
}

function expandInstallerArtifactName() {
  const pattern = packageJson.build?.nsis?.artifactName || '${productName} Setup ${version}.${ext}';
  const values = {
    productName: packageJson.build?.productName || packageJson.productName || packageJson.name,
    version: packageJson.version,
    ext: 'exe',
    name: packageJson.name,
  };

  return pattern.replace(/\$\{(\w+)\}/g, (_match, key) => (key in values ? values[key] : ''));
}

function getExpectedInstallerPath() {
  return join(buildOutputDir, expandInstallerArtifactName());
}

function getLegacyInstallerPath() {
  return join(buildOutputDir, `${packageJson.build?.productName || packageJson.productName || packageJson.name} ${packageJson.version}.exe`);
}

function getExpectedUninstallerPath(installerPath) {
  const parsed = parse(installerPath);
  return join(parsed.dir, `${parsed.name}.__uninstaller${parsed.ext}`);
}

function getExpectedBlockmapPath(installerPath) {
  return `${installerPath}.blockmap`;
}

function getPortableValidationExePath() {
  const executableName = packageJson.build?.executableName || 'Kurash Scoreboard';
  return join(buildOutputDir, 'win-unpacked', `${executableName}.exe`);
}

function removeStaleNsisArtifacts() {
  const installerPath = getExpectedInstallerPath();
  const legacyInstallerPath = getLegacyInstallerPath();
  const uninstallerPath = getExpectedUninstallerPath(installerPath);
  const blockmapPath = getExpectedBlockmapPath(installerPath);
  const legacyUninstallerPath = getExpectedUninstallerPath(legacyInstallerPath);
  const legacyBlockmapPath = getExpectedBlockmapPath(legacyInstallerPath);

  for (const target of [installerPath, uninstallerPath, blockmapPath, legacyInstallerPath, legacyUninstallerPath, legacyBlockmapPath]) {
    if (!existsSync(target)) {
      continue;
    }

    rmSync(target, { force: true });
  }
}

function hasInstallerArtifacts() {
  const installerPath = getExpectedInstallerPath();
  const portableExePath = getPortableValidationExePath();
  return existsSync(installerPath) && existsSync(portableExePath);
}

function assertExpectedArtifactsExist() {
  const installerPath = getExpectedInstallerPath();
  const portableExePath = getPortableValidationExePath();

  if (!existsSync(installerPath)) {
    console.error(`[build-nsis] Missing expected NSIS installer artifact: ${installerPath}`);
    process.exit(1);
  }

  if (!existsSync(portableExePath)) {
    console.error(`[build-nsis] Missing supported portable validation artifact: ${portableExePath}`);
    process.exit(1);
  }

  console.log(`[build-nsis] NSIS installer ready: ${installerPath}`);
  console.log(`[build-nsis] Supported runtime validation artifact: ${portableExePath}`);
}

async function main() {
  removeStaleNsisArtifacts();

  const firstAttempt = runElectronBuilder();
  if (firstAttempt.status === 0) {
    assertExpectedArtifactsExist();
    return;
  }

  if (!isMissingUninstallerRace(firstAttempt)) {
    process.exit(firstAttempt.status || 1);
  }

  if (hasInstallerArtifacts()) {
    console.warn('[build-nsis] NSIS reported the transient uninstaller-stub race, but the installer artifact was produced. Continuing with artifact validation.');
    assertExpectedArtifactsExist();
    return;
  }

  process.exit(firstAttempt.status || 1);
}

await main();
