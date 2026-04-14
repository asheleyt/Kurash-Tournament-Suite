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

function getExpectedUninstallerPath(installerPath) {
  const parsed = parse(installerPath);
  return join(parsed.dir, `${parsed.name}.__uninstaller${parsed.ext}`);
}

function getExpectedBlockmapPath(installerPath) {
  return `${installerPath}.blockmap`;
}

function removeStaleNsisArtifacts() {
  const installerPath = getExpectedInstallerPath();
  const uninstallerPath = getExpectedUninstallerPath(installerPath);
  const blockmapPath = getExpectedBlockmapPath(installerPath);

  for (const target of [installerPath, uninstallerPath, blockmapPath]) {
    if (!existsSync(target)) {
      continue;
    }

    rmSync(target, { force: true });
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedUninstallerFromStub(installerPath, uninstallerPath) {
  if (!existsSync(installerPath)) {
    return false;
  }

  const stubResult = spawnSync(installerPath, [], {
    cwd: dirname(installerPath),
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });

  if (stubResult.error) {
    console.warn(`[build-nsis] Failed to execute NSIS uninstaller stub: ${stubResult.error.message}`);
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (existsSync(uninstallerPath)) {
      return true;
    }
    await delay(1000);
  }

  return existsSync(uninstallerPath);
}

async function main() {
  removeStaleNsisArtifacts();

  const firstAttempt = runElectronBuilder();
  if (firstAttempt.status === 0) {
    return;
  }

  if (!isMissingUninstallerRace(firstAttempt)) {
    process.exit(firstAttempt.status || 1);
  }

  const installerPath = getExpectedInstallerPath();
  const uninstallerPath = getExpectedUninstallerPath(installerPath);
  console.warn('[build-nsis] Detected NSIS uninstaller generation race. Priming the generated stub and retrying once.');

  const seeded = await seedUninstallerFromStub(installerPath, uninstallerPath);
  if (!seeded) {
    console.error(`[build-nsis] Could not materialize the uninstaller stub at ${uninstallerPath}.`);
    process.exit(firstAttempt.status || 1);
  }

  const secondAttempt = runElectronBuilder();
  if (secondAttempt.status !== 0) {
    process.exit(secondAttempt.status || 1);
  }
}

await main();
