import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronAppDir = resolve(__dirname, '..');
const buildOutputDir = join(electronAppDir, 'build-output');
const exePath = join(buildOutputDir, 'win-unpacked', 'Kurash Scoreboard.exe');
const resultsPath = join(buildOutputDir, 'portable-validation-results.json');
const harnessScript = join(__dirname, 'validate-runtime-orchestrator.cjs');
const harnessResultsPath = join(buildOutputDir, 'runtime-orchestrator-validation.json');

if (!existsSync(harnessScript)) {
  console.error(`[verify-packaged-bootstrap] Missing runtime harness: ${harnessScript}`);
  process.exit(1);
}

if (!existsSync(exePath)) {
  console.error(`[verify-packaged-bootstrap] Missing supported validation artifact: ${exePath}`);
  process.exit(1);
}

const result = spawnSync('node', [harnessScript], {
  cwd: electronAppDir,
  encoding: 'utf8',
  windowsHide: true,
  maxBuffer: 64 * 1024 * 1024,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

let summary = null;
if (existsSync(harnessResultsPath)) {
  try {
    summary = JSON.parse(readFileSync(harnessResultsPath, 'utf8'));
    writeFileSync(resultsPath, JSON.stringify(summary, null, 2), 'utf8');
  } catch (error) {
    console.warn('[verify-packaged-bootstrap] Could not parse validation results JSON.', error);
  }
}

if (summary) {
  const firstRun = summary.firstRun || null;
  const secondRun = summary.secondRun || null;
  const recoveryRun = summary.recoveryRun || null;
  const logsDir = firstRun?.logsDir || secondRun?.logsDir || recoveryRun?.logsDir || summary?.debugState?.logsDir || null;
  const failures = Array.isArray(summary.validationFailures) ? summary.validationFailures : [];

  console.log('[verify-packaged-bootstrap] Packaged bootstrap validation summary:');
  console.log(` - Artifact: ${exePath}`);
  console.log(` - Results: ${resultsPath}`);
  if (logsDir) console.log(` - Logs: ${logsDir}`);
  if (firstRun?.status) console.log(` - First launch: ${firstRun.status}`);
  if (secondRun?.status) console.log(` - Relaunch: ${secondRun.status}`);
  if (recoveryRun?.status) console.log(` - Recovery launch: ${recoveryRun.status}`);
  if (failures.length > 0) {
    console.log(` - Validation failures: ${failures.length}`);
  }
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}
