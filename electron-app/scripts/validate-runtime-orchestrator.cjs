const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { RuntimeOrchestrator } = require('../runtime-orchestrator');

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probeTcpPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (isOpen) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function waitForRuntimePortsReleased(timeoutMs = 20000) {
  const startedAt = Date.now();
  const ports = [3406, 18000, 18080];

  while (Date.now() - startedAt <= timeoutMs) {
    const portStates = await Promise.all(ports.map((port) => probeTcpPort('127.0.0.1', port, 1500)));
    if (portStates.every((isOpen) => !isOpen)) {
      return true;
    }

    await delay(500);
  }

  return false;
}

function requestStatus(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      const statusCode = response.statusCode || 0;
      response.resume();
      response.on('end', () => resolve({ ok: statusCode >= 200 && statusCode < 300, statusCode }));
    });

    request.on('error', (error) => resolve({ ok: false, statusCode: null, error: error.message }));
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });
  });
}

function createFakeApp(userDataPath) {
  return {
    isPackaged: true,
    getPath(name) {
      if (name === 'userData') {
        return userDataPath;
      }
      throw new Error(`Unsupported fake app path request: ${name}`);
    },
  };
}

function killPid(pid) {
  if (!pid) return;
  spawnSync('taskkill', ['/pid', String(pid), '/f', '/t'], {
    windowsHide: true,
    encoding: 'utf8',
  });
}

function summarizeProbeFailures(probes) {
  return Object.entries(probes)
    .filter(([, probe]) => !probe.ok)
    .map(([name, probe]) => ({
      route: name,
      url: probe.url,
      statusCode: probe.statusCode,
      error: probe.error || null,
      expected: '2xx',
    }));
}

function parseArgs(argv) {
  const options = {};

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1];

    if (arg === '--resources-path' && nextValue) {
      options.resourcesPath = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--results-path' && nextValue) {
      options.resultsPath = nextValue;
      index += 1;
      continue;
    }
  }

  return options;
}

async function runIteration(label, userDataPath) {
  const app = createFakeApp(userDataPath);
  const orchestrator = new RuntimeOrchestrator(app);
  const launchStartedAt = new Date();

  try {
    const runtime = await orchestrator.start();
    const launchObservedAt = new Date();
    await delay(1500);
    const probes = {
      up: await requestStatus(`${runtime.localBackendBaseUrl}/up`),
      controller: await requestStatus(`${runtime.localBackendBaseUrl}/refereeController`),
      scoreboard: await requestStatus(`${runtime.localBackendBaseUrl}/kurashScoreBoard`),
    };
    const pids = {
      mysql: orchestrator.mysqlProcess && orchestrator.mysqlProcess.pid ? orchestrator.mysqlProcess.pid : null,
      server: orchestrator.serverProcess && orchestrator.serverProcess.pid ? orchestrator.serverProcess.pid : null,
      reverb: orchestrator.reverbProcess && orchestrator.reverbProcess.pid ? orchestrator.reverbProcess.pid : null,
    };
    const validationFailures = summarizeProbeFailures(probes);

    return {
      label,
      status: 'ready',
      runtime,
      launchStartedAt: launchStartedAt.toISOString(),
      launchObservedAt: launchObservedAt.toISOString(),
      launchDurationMs: Math.max(launchObservedAt.getTime() - launchStartedAt.getTime(), 0),
      probes,
      validationPassed: validationFailures.length === 0,
      validationFailures,
      pids,
      async shutdown() {
        orchestrator.shutdown();
        await waitForRuntimePortsReleased();
      },
      async forceKill() {
        killPid(pids.reverb);
        killPid(pids.server);
        killPid(pids.mysql);
        orchestrator.logger.close();
        await waitForRuntimePortsReleased();
      },
    };
  } catch (error) {
    const failure = {
      label,
      status: 'failed',
      stage: error && error.stage ? error.stage : null,
      reason: error && error.reason ? error.reason : (error && error.message ? error.message : String(error)),
      details: error && error.details ? error.details : null,
      logsDir: orchestrator.logsDir,
    };
    orchestrator.shutdown();
    return failure;
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const resourcesPath = path.resolve(
    options.resourcesPath || path.resolve(repoRoot, 'electron-app', 'build-output', 'win-unpacked', 'resources')
  );
  const resultsPath = path.resolve(
    options.resultsPath || path.resolve(repoRoot, 'electron-app', 'build-output', 'runtime-orchestrator-validation.json')
  );

  if (!fs.existsSync(resourcesPath)) {
    throw new Error(`Missing runtime harness resources path: ${resourcesPath}`);
  }

  process.resourcesPath = resourcesPath;

  const runRoot = path.join(os.tmpdir(), `Kurash Runtime Validation ${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}`);
  const userDataPath = path.join(runRoot, 'Roaming Profile With Spaces', 'Kurash Scoreboard');
  ensureDir(userDataPath);
  ensureDir(path.dirname(resultsPath));

  const results = {
    resourcesPath,
    resultsPath,
    runRoot,
    userDataPath,
    userData: userDataPath,
    isAdmin: false,
    xamppDetected: fs.existsSync('C:\\xampp\\mysql\\bin\\mysqld.exe') || fs.existsSync('C:\\xampp\\mysql\\bin\\mysql.exe'),
    firstRun: null,
    secondRun: null,
    recoveryRun: null,
    logFiles: [],
    mainLogTail: [],
    debugState: null,
  };

  try {
    results.isAdmin = spawnSync('powershell', ['-NoProfile', '-Command', "[bool](([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"], {
      windowsHide: true,
      encoding: 'utf8',
    }).stdout.trim() === 'True';
  } catch (error) {
  }

  const firstRun = await runIteration('firstRun', userDataPath);
  results.firstRun = firstRun.status === 'ready'
    ? {
        status: firstRun.status,
        baseUrl: firstRun.runtime.localBackendBaseUrl,
        logsDir: firstRun.runtime.logsDir,
        launchStartedAt: firstRun.launchStartedAt,
        launchObservedAt: firstRun.launchObservedAt,
        launchDurationMs: firstRun.launchDurationMs,
        probes: firstRun.probes,
        validationPassed: firstRun.validationPassed,
        validationFailures: firstRun.validationFailures,
        pids: firstRun.pids,
      }
    : firstRun;

  if (firstRun.status === 'ready') {
    await firstRun.shutdown();
  }

  const secondRun = await runIteration('secondRun', userDataPath);
  results.secondRun = secondRun.status === 'ready'
    ? {
        status: secondRun.status,
        baseUrl: secondRun.runtime.localBackendBaseUrl,
        logsDir: secondRun.runtime.logsDir,
        launchStartedAt: secondRun.launchStartedAt,
        launchObservedAt: secondRun.launchObservedAt,
        launchDurationMs: secondRun.launchDurationMs,
        probes: secondRun.probes,
        validationPassed: secondRun.validationPassed,
        validationFailures: secondRun.validationFailures,
        pids: secondRun.pids,
      }
    : secondRun;

  if (secondRun.status === 'ready') {
    await secondRun.forceKill();
  }

  const recoveryRun = await runIteration('recoveryRun', userDataPath);
  results.recoveryRun = recoveryRun.status === 'ready'
    ? {
        status: recoveryRun.status,
        baseUrl: recoveryRun.runtime.localBackendBaseUrl,
        logsDir: recoveryRun.runtime.logsDir,
        launchStartedAt: recoveryRun.launchStartedAt,
        launchObservedAt: recoveryRun.launchObservedAt,
        launchDurationMs: recoveryRun.launchDurationMs,
        probes: recoveryRun.probes,
        validationPassed: recoveryRun.validationPassed,
        validationFailures: recoveryRun.validationFailures,
        pids: recoveryRun.pids,
      }
    : recoveryRun;

  if (recoveryRun.status === 'ready') {
    await recoveryRun.shutdown();
  }

  const logsDir = path.join(userDataPath, 'logs');
  if (fs.existsSync(logsDir)) {
    results.logFiles = fs.readdirSync(logsDir)
      .map((name) => {
        const fullPath = path.join(logsDir, name);
        const stat = fs.statSync(fullPath);
        return {
          name,
          length: stat.size,
          lastModified: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const mainLogPath = path.join(logsDir, 'main.log');
    if (fs.existsSync(mainLogPath)) {
      results.mainLogTail = fs.readFileSync(mainLogPath, 'utf8').split(/\r?\n/).slice(-80);
    }

    const debugPath = path.join(logsDir, 'portable-env-debug.json');
    if (fs.existsSync(debugPath)) {
      results.debugState = JSON.parse(fs.readFileSync(debugPath, 'utf8'));
    }
  }

  const readinessFailures = ['firstRun', 'secondRun', 'recoveryRun']
    .filter((label) => !results[label] || results[label].status !== 'ready')
    .map((label) => ({
      run: label,
      reason: results[label] && results[label].reason ? results[label].reason : 'Runtime did not reach ready state.',
      stage: results[label] && results[label].stage ? results[label].stage : null,
    }));
  const routeFailures = ['firstRun', 'secondRun', 'recoveryRun']
    .flatMap((label) => {
      const run = results[label];
      if (!run || !Array.isArray(run.validationFailures)) {
        return [];
      }

      return run.validationFailures.map((failure) => ({
        run: label,
        ...failure,
      }));
    });

  results.validationFailures = [...readinessFailures, ...routeFailures];
  results.validationPassed = results.validationFailures.length === 0;
  results.validationSummary = {
    upHealthy: ['firstRun', 'secondRun', 'recoveryRun'].every((label) => results[label]?.probes?.up?.ok === true),
    refereeControllerHealthy: ['firstRun', 'secondRun', 'recoveryRun'].every((label) => results[label]?.probes?.controller?.ok === true),
    kurashScoreBoardHealthy: ['firstRun', 'secondRun', 'recoveryRun'].every((label) => results[label]?.probes?.scoreboard?.ok === true),
    secondLaunchPassed: results.secondRun?.status === 'ready' && results.secondRun?.validationPassed === true,
    recoveryPassed: results.recoveryRun?.status === 'ready' && results.recoveryRun?.validationPassed === true,
  };

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(resultsPath);

  if (!results.validationPassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
