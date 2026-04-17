const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const PACKAGED_PORTS = {
  server: 18000,
  db: 3406,
  reverb: 18080,
};

const DEVELOPMENT_PORTS = {
  server: 18010,
  db: 3407,
  reverb: 18081,
};

const REQUIRED_PHP_EXTENSIONS = ['mbstring', 'pdo_mysql', 'mysqli', 'openssl', 'fileinfo'];
const REQUIRED_PHP_EXTENSION_FILES = [
  'php_mbstring.dll',
  'php_pdo_mysql.dll',
  'php_mysqli.dll',
  'php_openssl.dll',
  'php_fileinfo.dll',
];
const REQUIRED_PHP_RUNTIME_DLLS = [
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
const WINDOWS_DLL_NOT_FOUND_EXIT_CODES = new Set([3221225781, 3221226505]);

const FORBIDDEN_PHP_PORTABILITY_PATTERNS = [/C:\\xampp/i, /xampp\\php/i, /xampp\/php/i];

function findForbiddenPhpPortabilityMatches(text) {
  const haystack = String(text || '');
  const matches = [];
  for (const pattern of FORBIDDEN_PHP_PORTABILITY_PATTERNS) {
    const match = haystack.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

function diagnosePhpPortabilityFailure(output) {
  const combined = String(output || '');

  const forbidden = findForbiddenPhpPortabilityMatches(combined);
  if (forbidden.length > 0) {
    return {
      reason: 'PHP config not portable (forbidden XAMPP paths detected)',
      forbidden,
    };
  }

  if (/\bPHP\s+(?:Warning|Fatal error):/i.test(combined) || /\bPHP\s+Startup:/i.test(combined)) {
    return {
      reason: 'PHP startup/config warning detected',
      forbidden: [],
    };
  }

  if (/\bUnable to load dynamic library\b/i.test(combined) || /\bUnable to start standard module\b/i.test(combined)) {
    return {
      reason: 'PHP extension resolution failed',
      forbidden: [],
    };
  }

  return null;
}

const MYSQL_READY_TIMEOUT_MS = 90000;
const LARAVEL_READY_TIMEOUT_MS = 90000;
const REVERB_READY_TIMEOUT_MS = 30000;

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function normalizeForIni(targetPath) {
  return String(targetPath || '').replace(/\\/g, '/');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify(String(value));
  }
}

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

function diagnoseWindowsDependencyFailure(result = {}) {
  const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}\n${result.error?.message || ''}`;
  const dependencyMatch = combinedOutput.match(
    /\b(vcruntime140(?:_1)?\.dll|msvcp140(?:_[\w]+)?\.dll|ucrtbase\.dll|api-ms-win-crt-[\w-]+\.dll)\b/i
  );
  const normalizedExitCode = normalizeExitCode(result.status);

  if (dependencyMatch) {
    return {
      dependency: dependencyMatch[1],
      reason: `Packaged PHP failed to launch: missing VC++ runtime dependency (${dependencyMatch[1]})`,
      normalizedExitCode,
    };
  }

  if (WINDOWS_DLL_NOT_FOUND_EXIT_CODES.has(normalizedExitCode)) {
    return {
      dependency: null,
      reason: 'Packaged PHP failed to launch: missing dependency DLL',
      normalizedExitCode,
    };
  }

  return null;
}

function normalizeRemoteApiBase(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) {
    return '';
  }

  let normalized = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(normalized)) {
    normalized = `http://${normalized}`;
  }

  const parsed = new URL(normalized);
  const pathname = /\/api\/?$/i.test(parsed.pathname)
    ? '/api'
    : `${parsed.pathname.replace(/\/+$/, '') || ''}/api`;

  return `${parsed.origin}${pathname}`;
}

function isLoopback8000(urlValue) {
  if (!urlValue) return false;

  try {
    const parsed = new URL(urlValue);
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    return (hostname === '127.0.0.1' || hostname === 'localhost') && port === '8000';
  } catch (error) {
    return false;
  }
}

function requestStatus(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      const statusCode = response.statusCode || 0;
      response.resume();
      response.on('end', () => resolve(statusCode));
    });

    request.on('error', reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });
  });
}

function probeTcpPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

class RuntimeStageError extends Error {
  constructor(stage, reason, details = null) {
    super(reason);
    this.name = 'RuntimeStageError';
    this.stage = stage;
    this.reason = reason;
    this.details = details;
  }
}

class PersistentRuntimeLogger {
  constructor(logsDir) {
    ensureDir(logsDir);
    this.logsDir = logsDir;
    this.paths = {
      main: path.join(logsDir, 'main.log'),
      php: path.join(logsDir, 'php.log'),
      reverb: path.join(logsDir, 'reverb.log'),
      mysql: path.join(logsDir, 'mysql.log'),
      debug: path.join(logsDir, 'portable-env-debug.json'),
    };
    this.processStreams = new Map();

    Object.values(this.paths).forEach((targetPath) => {
      if (!fs.existsSync(targetPath)) {
        fs.closeSync(fs.openSync(targetPath, 'a'));
      }
    });
  }

  append(targetPath, content) {
    fs.appendFileSync(targetPath, content);
  }

  log(level, message, meta = null) {
    const suffix = meta ? ` ${safeStringify(meta)}` : '';
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${suffix}`;
    this.append(this.paths.main, `${line}\n`);

    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  info(message, meta = null) {
    this.log('info', message, meta);
  }

  warn(message, meta = null) {
    this.log('warn', message, meta);
  }

  error(message, meta = null) {
    this.log('error', message, meta);
  }

  openProcessStream(key) {
    if (!this.paths[key]) {
      throw new Error(`Unknown process log key: ${key}`);
    }

    if (!this.processStreams.has(key)) {
      const targetPath = this.paths[key];
      this.processStreams.set(key, {
        write: (chunk) => {
          if (typeof chunk === 'undefined' || chunk === null) {
            return;
          }
          this.append(targetPath, chunk);
        },
        end: () => {},
      });
    }

    return this.processStreams.get(key);
  }

  writeProcessSection(key, title, body) {
    if (!body) return;
    const stream = this.openProcessStream(key);
    const suffix = body.endsWith('\n') ? '' : '\n';
    stream.write(`\n[${new Date().toISOString()}] ${title}\n${body}${suffix}`);
  }

  writeDebugJson(payload) {
    fs.writeFileSync(this.paths.debug, JSON.stringify(payload, null, 2), 'utf8');
  }

  close() {
    this.processStreams.clear();
  }
}

class RuntimeOrchestrator {
  constructor(app) {
    this.app = app;
    this.isPackaged = app.isPackaged;
    this.ports = this.isPackaged ? PACKAGED_PORTS : DEVELOPMENT_PORTS;
    this.userDataPath = app.getPath('userData');
    this.logsDir = path.join(this.userDataPath, 'logs');
    ensureDir(this.logsDir);

    this.logger = new PersistentRuntimeLogger(this.logsDir);
    this.state = null;
    this.childEnv = null;
    this.mysqlProcess = null;
    this.serverProcess = null;
    this.reverbProcess = null;
    this.localBackendBaseUrl = `http://127.0.0.1:${this.ports.server}`;
    this.debugState = {
      startedAt: new Date().toISOString(),
      mode: this.isPackaged ? 'packaged' : 'development',
      logsDir: this.logsDir,
      localBackendBaseUrl: this.localBackendBaseUrl,
      ports: { ...this.ports },
      stages: [],
      paths: {},
      env: {},
      processes: {},
      finalStatus: 'starting',
      failure: null,
      readyAt: null,
    };
  }

  async start() {
    await this.runStage('resolve packaged/runtime paths', async () => {
      this.resolvePaths();
    });

    await this.runStage('verify required binaries exist', async () => {
      this.verifyRequiredBinaries();
    });

    await this.runStage('run PHP preflight', async () => {
      this.runPhpPreflight();
    });

    await this.runStage('ensure writable runtime directories exist', async () => {
      this.ensureWritableRuntimeDirectories();
    });

    await this.runStage('initialize DB data if first run', async () => {
      await this.initializeDbDataIfNeeded();
    });

    await this.runStage('start MariaDB', async () => {
      await this.startMariaDb();
    });

    await this.runStage('wait for real DB readiness', async () => {
      await this.waitForMariaDbReady();
    });

    await this.runStage('start Laravel HTTP server', async () => {
      await this.startLaravelServer();
    });

    await this.runStage('wait for Laravel health endpoint', async () => {
      await this.waitForLaravelReady();
    });

    await this.runStage('start Reverb', async () => {
      await this.startReverb();
    });

    await this.runStage('mark app ready', async () => {
      this.debugState.finalStatus = 'ready';
      this.debugState.readyAt = new Date().toISOString();
      if (this.isPackaged) {
        this.logger.info('Packaged runtime marked ready', {
          localBackendBaseUrl: this.localBackendBaseUrl,
          runtimeRoot: this.state.runtimeRoot,
          phpBin: this.state.phpBin,
          mariadbBin: this.state.mysqld,
          laravelRoot: this.state.laravelRoot,
        });
      } else {
        this.logger.info('Development runtime marked ready', {
          localBackendBaseUrl: this.localBackendBaseUrl,
          phpBin: this.state.phpBin,
          mariadbBin: this.state.mysqld,
        });
      }
      this.persistDebugState();
    });

    return {
      localBackendBaseUrl: this.localBackendBaseUrl,
      logsDir: this.logsDir,
      runtimePaths: this.state,
    };
  }

  resolvePaths() {
    const laravelRoot = this.isPackaged
      ? path.join(process.resourcesPath, 'laravel')
      : path.join(__dirname, '..');
    const portableRoot = this.isPackaged
      ? path.join(process.resourcesPath, 'portable')
      : path.join(__dirname, '..', 'portable');
    const portableRuntimeRoot = path.join(portableRoot, 'runtime');
    const runtimeManifestPath = path.join(portableRuntimeRoot, 'runtime-manifest.json');

    const phpDir = path.join(portableRuntimeRoot, 'php');
    const phpBin = path.join(phpDir, 'php.exe');
    const phpIni = path.join(phpDir, 'php.ini');
    const phpExtDir = path.join(phpDir, 'ext');

    const mysqlDir = path.join(portableRuntimeRoot, 'mariadb');
    const mysqlBinDir = path.join(mysqlDir, 'bin');
    const mysqld = path.join(mysqlBinDir, 'mysqld.exe');
    const mysql = path.join(mysqlBinDir, 'mysql.exe');
    const mysqladmin = path.join(mysqlBinDir, 'mysqladmin.exe');
    const mysqlInstallDb = path.join(mysqlBinDir, 'mysql_install_db.exe');
    const mariadbTemplatePath = path.join(mysqlDir, 'my.ini.template');

    const runtimeRoot = path.join(this.userDataPath, 'runtime');
    const laravelStoragePath = path.join(runtimeRoot, 'laravel-storage');
    const bootstrapCachePath = path.join(runtimeRoot, 'bootstrap-cache');
    const mysqlRuntimePath = path.join(runtimeRoot, 'mariadb');
    const mysqlDataDir = path.join(mysqlRuntimePath, 'data');
    const mysqlTempDir = path.join(mysqlRuntimePath, 'tmp');
    const mysqlRunDir = path.join(mysqlRuntimePath, 'run');
    const mysqlConfigPath = path.join(mysqlRuntimePath, 'my.ini');
    const mysqlInitMarker = path.join(mysqlRuntimePath, 'initialized.json');
    const laravelStorageSeedAppPath = this.isPackaged
      ? path.join(laravelRoot, 'storage-seed', 'app')
      : path.join(laravelRoot, 'storage', 'app');
    const laravelStorageSeedMarker = path.join(runtimeRoot, 'laravel-app-storage-seeded.json');
    const envPath = path.join(laravelRoot, '.env');
    const hotFilePath = path.join(laravelRoot, 'public', 'hot');

    const useSystemPhp = !this.isPackaged && !fs.existsSync(phpBin);
    const manageMysql = fs.existsSync(mysqld) && fs.existsSync(mysql) && fs.existsSync(mysqladmin);

    this.state = {
      laravelRoot,
      portableRoot,
      portableRuntimeRoot,
      runtimeManifestPath,
      phpDir,
      phpBin: useSystemPhp ? 'php' : phpBin,
      phpIni,
      phpExtDir,
      mysqlDir,
      mysqlBinDir,
      mysqld,
      mysql,
      mysqladmin,
      mysqlInstallDb,
      mariadbTemplatePath,
      runtimeRoot,
      laravelStoragePath,
      bootstrapCachePath,
      mysqlRuntimePath,
      mysqlDataDir,
      mysqlTempDir,
      mysqlRunDir,
      mysqlConfigPath,
      mysqlInitMarker,
      laravelStorageSeedAppPath,
      laravelStorageSeedMarker,
      envPath,
      envPathExists: fs.existsSync(envPath),
      hotFilePath,
      useSystemPhp,
      manageMysql,
    };

    this.childEnv = this.buildChildEnv();
    this.debugState.paths = {
      laravelRoot,
      portableRoot,
      portableRuntimeRoot,
      runtimeManifestPath,
      phpDir,
      phpBin: this.state.phpBin,
      phpIni,
      phpExtDir,
      mysqlDir,
      mysqlBinDir,
      mysqld,
      mysql,
      mysqladmin,
      mysqlInstallDb,
      mariadbTemplatePath,
      runtimeRoot,
      laravelStoragePath,
      bootstrapCachePath,
      mysqlRuntimePath,
      mysqlDataDir,
      mysqlTempDir,
      mysqlRunDir,
      mysqlConfigPath,
      mysqlInitMarker,
      laravelStorageSeedAppPath,
      laravelStorageSeedMarker,
      hotFilePath,
    };
    this.debugState.env = {
      envPathExists: this.state.envPathExists,
      useSystemPhp,
      localBackendBaseUrl: this.localBackendBaseUrl,
      remoteAdminBaseUrl: this.childEnv.KURASH_API_BASE || '',
      storagePath: this.childEnv.LARAVEL_STORAGE_PATH,
      configCachePath: this.childEnv.APP_CONFIG_CACHE,
      routesCachePath: this.childEnv.APP_ROUTES_CACHE,
      eventsCachePath: this.childEnv.APP_EVENTS_CACHE,
      servicesCachePath: this.childEnv.APP_SERVICES_CACHE,
      packagesCachePath: this.childEnv.APP_PACKAGES_CACHE,
      storageSeedPath: this.state.laravelStorageSeedAppPath,
      storageSeedMarker: this.state.laravelStorageSeedMarker,
      phpIniScanDir: this.childEnv.PHP_INI_SCAN_DIR || null,
    };

    if (this.isPackaged) {
      const packagedPathChecks = this.collectPackagedRuntimePathChecks();
      this.debugState.packagedPathChecks = packagedPathChecks;
      this.logger.info('Resolved packaged runtime paths', {
        localBackendBaseUrl: this.localBackendBaseUrl,
        runtimeRoot: this.state.runtimeRoot,
        portableRuntimeRoot: this.state.portableRuntimeRoot,
        phpBin: this.state.phpBin,
        phpIni: this.state.phpIni,
        mariadbBin: this.state.mysqld,
        mysqlPort: this.ports.db,
        laravelRoot: this.state.laravelRoot,
        logsDir: this.logsDir,
        userDataPath: this.userDataPath,
        workingDirectory: process.cwd(),
        pathChecks: packagedPathChecks,
      });
    }

    if (this.isPackaged && isLoopback8000(this.childEnv.KURASH_API_BASE)) {
      this.logger.warn('Packaged remote admin API still resolves to a stale loopback endpoint. Clear it or update Fallback Setup.', {
        remoteAdminBaseUrl: this.childEnv.KURASH_API_BASE,
      });
    }

    this.persistDebugState();
  }

  collectPackagedRuntimePathChecks() {
    if (!this.isPackaged || !this.state) return [];

    return [
      { label: 'portable runtime root', target: this.state.portableRuntimeRoot, exists: fs.existsSync(this.state.portableRuntimeRoot) },
      { label: 'runtime manifest', target: this.state.runtimeManifestPath, exists: fs.existsSync(this.state.runtimeManifestPath) },
      { label: 'Laravel root', target: this.state.laravelRoot, exists: fs.existsSync(this.state.laravelRoot) },
      { label: 'PHP executable', target: this.state.phpBin, exists: fs.existsSync(this.state.phpBin) },
      { label: 'PHP ini', target: this.state.phpIni, exists: fs.existsSync(this.state.phpIni) },
      { label: 'PHP ext directory', target: this.state.phpExtDir, exists: fs.existsSync(this.state.phpExtDir) },
      ...REQUIRED_PHP_RUNTIME_DLLS.map((dllName) => ({
        label: `PHP runtime DLL ${dllName}`,
        target: path.join(this.state.phpDir, dllName),
        exists: fs.existsSync(path.join(this.state.phpDir, dllName)),
      })),
      { label: 'MariaDB directory', target: this.state.mysqlDir, exists: fs.existsSync(this.state.mysqlDir) },
      { label: 'MariaDB mysqld.exe', target: this.state.mysqld, exists: fs.existsSync(this.state.mysqld) },
      { label: 'MariaDB mysql.exe', target: this.state.mysql, exists: fs.existsSync(this.state.mysql) },
      { label: 'MariaDB mysqladmin.exe', target: this.state.mysqladmin, exists: fs.existsSync(this.state.mysqladmin) },
      { label: 'MariaDB mysql_install_db.exe', target: this.state.mysqlInstallDb, exists: fs.existsSync(this.state.mysqlInstallDb) },
      { label: 'MariaDB template', target: this.state.mariadbTemplatePath, exists: fs.existsSync(this.state.mariadbTemplatePath) },
      { label: 'Laravel storage seed', target: this.state.laravelStorageSeedAppPath, exists: fs.existsSync(this.state.laravelStorageSeedAppPath) },
    ];
  }

  buildChildEnv() {
    const env = { ...process.env };
    const remoteAdminBase = normalizeRemoteApiBase(
      env.KURASH_REMOTE_API_BASE || env.KURASH_API_BASE || env.API_BASE_URL || ''
    );

    if (!this.state.useSystemPhp) {
      env.PHPRC = this.state.phpDir;
      env.PHP_INI_SCAN_DIR = '';
    }

    env.KURASH_RUNTIME_MODE = this.isPackaged ? 'packaged' : 'development';
    env.KURASH_LOCAL_BACKEND_BASE_URL = this.localBackendBaseUrl;
    env.LARAVEL_STORAGE_PATH = this.state.laravelStoragePath;
    env.APP_SERVICES_CACHE = path.join(this.state.bootstrapCachePath, 'services.php');
    env.APP_PACKAGES_CACHE = path.join(this.state.bootstrapCachePath, 'packages.php');
    env.APP_CONFIG_CACHE = path.join(this.state.bootstrapCachePath, 'config.php');
    env.APP_ROUTES_CACHE = path.join(this.state.bootstrapCachePath, 'routes-v7.php');
    env.APP_EVENTS_CACHE = path.join(this.state.bootstrapCachePath, 'events.php');
    env.VIEW_COMPILED_PATH = path.join(this.state.laravelStoragePath, 'framework', 'views');
    env.KURASH_REMOTE_API_BASE = remoteAdminBase;
    env.KURASH_API_BASE = remoteAdminBase;
    env.API_BASE_URL = remoteAdminBase;
    env.LOG_CHANNEL = 'single';
    env.LOG_STACK = 'single';
    env.LOG_LEVEL = env.LOG_LEVEL || 'debug';

    if (!env.APP_KEY && !this.state.envPathExists) {
      env.APP_KEY = '0123456789abcdef0123456789abcdef';
    }

    if (this.isPackaged) {
      env.APP_NAME = env.APP_NAME || 'Kurash Scoreboard';
      env.APP_ENV = 'production';
      env.APP_DEBUG = 'false';
      env.APP_URL = this.localBackendBaseUrl;
      env.DB_CONNECTION = 'mariadb';
      env.DB_HOST = '127.0.0.1';
      env.DB_PORT = String(this.ports.db);
      env.DB_DATABASE = 'laravel';
      env.DB_USERNAME = 'root';
      env.DB_PASSWORD = '';
      env.DB_SOCKET = '';
      env.CACHE_STORE = 'file';
      env.CACHE_DRIVER = 'file';
      env.SESSION_DRIVER = 'file';
      env.QUEUE_CONNECTION = 'sync';
      env.BROADCAST_CONNECTION = 'reverb';
      env.REVERB_SERVER_HOST = '127.0.0.1';
      env.REVERB_SERVER_PORT = String(this.ports.reverb);
      env.REVERB_HOST = '127.0.0.1';
      env.REVERB_PORT = String(this.ports.reverb);
      env.REVERB_SCHEME = 'http';
      env.REVERB_APP_ID = env.REVERB_APP_ID || 'kurash-app-id';
      env.REVERB_APP_KEY = env.REVERB_APP_KEY || 'kurash-app-key';
      env.REVERB_APP_SECRET = env.REVERB_APP_SECRET || 'kurash-app-secret';
      env.PUSHER_APP_ID = env.PUSHER_APP_ID || env.REVERB_APP_ID;
      env.PUSHER_APP_KEY = env.PUSHER_APP_KEY || env.REVERB_APP_KEY;
      env.PUSHER_APP_SECRET = env.PUSHER_APP_SECRET || env.REVERB_APP_SECRET;
      env.PUSHER_HOST = env.PUSHER_HOST || '127.0.0.1';
      env.PUSHER_PORT = env.PUSHER_PORT || String(this.ports.reverb);
      env.PUSHER_SCHEME = env.PUSHER_SCHEME || 'http';
    }

    return env;
  }

  persistDebugState() {
    this.logger.writeDebugJson(this.debugState);
  }

  async runStage(stageName, action) {
    const stageRecord = {
      name: stageName,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    };
    this.debugState.stages.push(stageRecord);
    this.logger.info(`Stage start: ${stageName}`);
    this.persistDebugState();

    try {
      const result = await action();
      stageRecord.status = 'success';
      stageRecord.finishedAt = new Date().toISOString();
      this.logger.info(`Stage success: ${stageName}`);
      this.persistDebugState();
      return result;
    } catch (error) {
      const stageError = error instanceof RuntimeStageError
        ? error
        : new RuntimeStageError(stageName, error && error.message ? error.message : String(error));

      stageRecord.status = 'failed';
      stageRecord.finishedAt = new Date().toISOString();
      stageRecord.reason = stageError.reason;
      stageRecord.details = stageError.details || null;
      this.debugState.finalStatus = 'failed';
      this.debugState.failure = {
        stage: stageError.stage || stageName,
        reason: stageError.reason,
        details: stageError.details || null,
      };
      this.logger.error(`Stage failed: ${stageName}`, {
        failureStage: stageError.stage || stageName,
        reason: stageError.reason,
        details: stageError.details || null,
      });
      this.persistDebugState();
      throw stageError;
    }
  }

  verifyRequiredBinaries() {
    if (this.isPackaged) {
      const packagedPathChecks = this.collectPackagedRuntimePathChecks();
      const missingPackagedPathCheck = packagedPathChecks.find((item) => !item.exists);
      this.debugState.packagedPathChecks = packagedPathChecks;
      this.logger.info('Packaged runtime required path checks', {
        checks: packagedPathChecks,
        missingCount: packagedPathChecks.filter((item) => !item.exists).length,
      });

      if (missingPackagedPathCheck) {
        const missingPhpRuntimeDependency = /^PHP runtime DLL /i.test(missingPackagedPathCheck.label);
        throw new RuntimeStageError(
          'verify required binaries exist',
          missingPhpRuntimeDependency ? 'Packaged PHP dependency DLL missing' : 'Packaged runtime invalid',
          {
          missingPath: missingPackagedPathCheck.target,
          missingLabel: missingPackagedPathCheck.label,
          packagedPathChecks,
          }
        );
      }
    } else {
      if (this.state.useSystemPhp) {
        this.logger.warn('Development mode is using system PHP because portable/runtime/php/php.exe is missing.');
      }

      if (!this.state.manageMysql) {
        this.logger.warn('Development mode did not find portable/runtime/mariadb binaries. External DB startup is expected.');
      }
    }

    const missingExtensionFiles = REQUIRED_PHP_EXTENSION_FILES.filter((fileName) => {
      if (!this.state.phpExtDir || this.state.useSystemPhp) return false;
      return !fs.existsSync(path.join(this.state.phpExtDir, fileName));
    });

    if (missingExtensionFiles.length > 0) {
      if (this.isPackaged) {
        throw new RuntimeStageError('verify required binaries exist', 'Packaged PHP extension DLL missing', {
          missingExtensionFiles,
        });
      }

      this.logger.warn('Portable PHP extension files are missing and build verification should fail before packaging.', {
        missingExtensionFiles,
      });
    }
  }

  runPhpPreflight() {
    const phpVersionArgs = ['-v'];
    const phpIniArgs = ['--ini'];
    const phpModulesArgs = ['-m'];

    if (!this.state.useSystemPhp && fs.existsSync(this.state.phpIni)) {
      let iniText = '';
      try {
        iniText = fs.readFileSync(this.state.phpIni, 'utf8');
      } catch (error) {
        throw new RuntimeStageError('run PHP preflight', 'PHP ini unreadable', {
          phpIni: this.state.phpIni,
          error: error && error.message ? error.message : String(error),
        });
      }

      const forbiddenIniMatches = findForbiddenPhpPortabilityMatches(iniText);
      if (forbiddenIniMatches.length > 0) {
        throw new RuntimeStageError('run PHP preflight', 'PHP config not portable', {
          phpIni: this.state.phpIni,
          forbiddenIniMatches,
        });
      }
    }

    const versionResult = this.runCommandCapture(this.state.phpBin, phpVersionArgs, {
      cwd: this.state.laravelRoot,
      env: this.childEnv,
    });
    this.logger.writeProcessSection('php', `${this.state.phpBin} ${phpVersionArgs.join(' ')}`, `${versionResult.stdout || ''}${versionResult.stderr || ''}`);

    if (versionResult.error || versionResult.status !== 0) {
      const dependencyFailure = diagnoseWindowsDependencyFailure(versionResult);
      throw new RuntimeStageError(
        'run PHP preflight',
        dependencyFailure ? dependencyFailure.reason : 'PHP runtime invalid',
        {
          command: `${this.state.phpBin} ${phpVersionArgs.join(' ')}`,
          exitCode: versionResult.status,
          normalizedExitCode: normalizeExitCode(versionResult.status),
          phpBin: this.state.phpBin,
          logsDir: this.logsDir,
          dependencyFailure: !!dependencyFailure,
          dependencyDll: dependencyFailure ? dependencyFailure.dependency : null,
          error: versionResult.error ? versionResult.error.message : summarizeOutput(versionResult.stderr || versionResult.stdout),
        }
      );
    }

    if (!this.state.useSystemPhp) {
      const combinedOutput = `${versionResult.stdout || ''}${versionResult.stderr || ''}`;
      const portabilityFailure = diagnosePhpPortabilityFailure(combinedOutput);
      if (portabilityFailure) {
        throw new RuntimeStageError('run PHP preflight', portabilityFailure.reason, {
          command: `${this.state.phpBin} ${phpVersionArgs.join(' ')}`,
          phpBin: this.state.phpBin,
          phpIni: this.state.phpIni,
          logsDir: this.logsDir,
          forbiddenMatches: portabilityFailure.forbidden,
          output: summarizeOutput(combinedOutput),
        });
      }
    }

    const iniResult = this.runCommandCapture(this.state.phpBin, phpIniArgs, {
      cwd: this.state.laravelRoot,
      env: this.childEnv,
    });
    this.logger.writeProcessSection('php', `${this.state.phpBin} ${phpIniArgs.join(' ')}`, `${iniResult.stdout || ''}${iniResult.stderr || ''}`);

    if (iniResult.error || iniResult.status !== 0) {
      const dependencyFailure = diagnoseWindowsDependencyFailure(iniResult);
      throw new RuntimeStageError(
        'run PHP preflight',
        dependencyFailure ? dependencyFailure.reason : 'PHP runtime invalid',
        {
          command: `${this.state.phpBin} ${phpIniArgs.join(' ')}`,
          exitCode: iniResult.status,
          normalizedExitCode: normalizeExitCode(iniResult.status),
          phpBin: this.state.phpBin,
          logsDir: this.logsDir,
          dependencyFailure: !!dependencyFailure,
          dependencyDll: dependencyFailure ? dependencyFailure.dependency : null,
          error: iniResult.error ? iniResult.error.message : summarizeOutput(iniResult.stderr || iniResult.stdout),
        }
      );
    }

    if (!this.state.useSystemPhp) {
      const combinedOutput = `${iniResult.stdout || ''}${iniResult.stderr || ''}`;
      const portabilityFailure = diagnosePhpPortabilityFailure(combinedOutput);
      if (portabilityFailure) {
        throw new RuntimeStageError('run PHP preflight', portabilityFailure.reason, {
          command: `${this.state.phpBin} ${phpIniArgs.join(' ')}`,
          phpBin: this.state.phpBin,
          phpIni: this.state.phpIni,
          logsDir: this.logsDir,
          forbiddenMatches: portabilityFailure.forbidden,
          output: summarizeOutput(combinedOutput),
        });
      }

      const iniStdout = String(iniResult.stdout || '');
      const loadedMatch = iniStdout.match(/^Loaded Configuration File:\s*(.+)$/im);
      const loadedPath = loadedMatch ? loadedMatch[1].trim() : '';

      if (!loadedPath || loadedPath.toLowerCase() === '(none)') {
        throw new RuntimeStageError('run PHP preflight', 'PHP did not load php.ini', {
          command: `${this.state.phpBin} ${phpIniArgs.join(' ')}`,
          phpBin: this.state.phpBin,
          phpIni: this.state.phpIni,
          logsDir: this.logsDir,
          output: summarizeOutput(`${iniResult.stdout || ''}${iniResult.stderr || ''}`),
        });
      }

      const expectedIni = normalizeForIni(this.state.phpIni).toLowerCase();
      const actualIni = normalizeForIni(loadedPath).toLowerCase();
      if (actualIni !== expectedIni) {
        throw new RuntimeStageError('run PHP preflight', 'PHP loaded unexpected php.ini', {
          command: `${this.state.phpBin} ${phpIniArgs.join(' ')}`,
          phpBin: this.state.phpBin,
          phpIni: this.state.phpIni,
          expectedIni,
          actualIni,
          logsDir: this.logsDir,
        });
      }

      const scanMatch = iniStdout.match(/^Scan for additional \.ini files in:\s*(.+)$/im);
      if (scanMatch) {
        const scanPath = scanMatch[1].trim();
        if (scanPath && scanPath.toLowerCase() !== '(none)') {
          throw new RuntimeStageError('run PHP preflight', 'PHP is scanning additional ini directories', {
            command: `${this.state.phpBin} ${phpIniArgs.join(' ')}`,
            phpBin: this.state.phpBin,
            phpIni: this.state.phpIni,
            scanPath,
            logsDir: this.logsDir,
          });
        }
      }
    }

    const modulesResult = this.runCommandCapture(this.state.phpBin, phpModulesArgs, {
      cwd: this.state.laravelRoot,
      env: this.childEnv,
    });
    this.logger.writeProcessSection('php', `${this.state.phpBin} ${phpModulesArgs.join(' ')}`, `${modulesResult.stdout || ''}${modulesResult.stderr || ''}`);

    if (modulesResult.error || modulesResult.status !== 0) {
      const dependencyFailure = diagnoseWindowsDependencyFailure(modulesResult);
      throw new RuntimeStageError(
        'run PHP preflight',
        dependencyFailure ? dependencyFailure.reason : 'PHP runtime invalid',
        {
          command: `${this.state.phpBin} ${phpModulesArgs.join(' ')}`,
          exitCode: modulesResult.status,
          normalizedExitCode: normalizeExitCode(modulesResult.status),
          phpBin: this.state.phpBin,
          logsDir: this.logsDir,
          dependencyFailure: !!dependencyFailure,
          dependencyDll: dependencyFailure ? dependencyFailure.dependency : null,
          error: modulesResult.error ? modulesResult.error.message : summarizeOutput(modulesResult.stderr || modulesResult.stdout),
        }
      );
    }

    if (!this.state.useSystemPhp) {
      const combinedOutput = `${modulesResult.stdout || ''}${modulesResult.stderr || ''}`;
      const portabilityFailure = diagnosePhpPortabilityFailure(combinedOutput);
      if (portabilityFailure) {
        throw new RuntimeStageError('run PHP preflight', portabilityFailure.reason, {
          command: `${this.state.phpBin} ${phpModulesArgs.join(' ')}`,
          phpBin: this.state.phpBin,
          phpIni: this.state.phpIni,
          logsDir: this.logsDir,
          forbiddenMatches: portabilityFailure.forbidden,
          output: summarizeOutput(combinedOutput),
        });
      }
    }

    const loadedExtensions = new Set(
      String(modulesResult.stdout || '')
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line && !line.startsWith('[') && !line.endsWith(']'))
    );
    const missingExtensions = REQUIRED_PHP_EXTENSIONS.filter((extension) => !loadedExtensions.has(extension));

    if (missingExtensions.length > 0) {
      throw new RuntimeStageError('run PHP preflight', 'required PHP extension missing', {
        missingExtensions,
      });
    }

    this.logger.info('PHP preflight passed', {
      phpBin: this.state.phpBin,
      phpIni: this.state.phpIni,
      commands: ['-v', '--ini', '-m'],
      extensions: REQUIRED_PHP_EXTENSIONS,
    });
  }

  ensureWritableRuntimeDirectories() {
    const directories = [
      this.logsDir,
      this.state.runtimeRoot,
      this.state.laravelStoragePath,
      path.join(this.state.laravelStoragePath, 'framework'),
      path.join(this.state.laravelStoragePath, 'framework', 'cache'),
      path.join(this.state.laravelStoragePath, 'framework', 'cache', 'data'),
      path.join(this.state.laravelStoragePath, 'framework', 'sessions'),
      path.join(this.state.laravelStoragePath, 'framework', 'testing'),
      path.join(this.state.laravelStoragePath, 'framework', 'views'),
      path.join(this.state.laravelStoragePath, 'logs'),
      this.state.bootstrapCachePath,
      this.state.mysqlRuntimePath,
      this.state.mysqlDataDir,
      this.state.mysqlTempDir,
      this.state.mysqlRunDir,
    ];

    directories.forEach(ensureDir);
    this.seedBundledLaravelAppStorageIfNeeded();
    this.logger.openProcessStream('php');
    this.logger.openProcessStream('reverb');
    this.logger.openProcessStream('mysql');

    const cacheFiles = [
      this.childEnv.APP_SERVICES_CACHE,
      this.childEnv.APP_PACKAGES_CACHE,
      this.childEnv.APP_CONFIG_CACHE,
      this.childEnv.APP_ROUTES_CACHE,
      this.childEnv.APP_EVENTS_CACHE,
    ];
    cacheFiles.forEach((cacheFile) => {
      if (fs.existsSync(cacheFile)) {
        fs.rmSync(cacheFile, { force: true });
      }
    });

    if (fs.existsSync(this.state.hotFilePath)) {
      fs.rmSync(this.state.hotFilePath, { force: true });
      this.logger.info('Removed stale Vite hot file from runtime payload', {
        hotFilePath: this.state.hotFilePath,
      });
    }

    this.logger.info('Ensured writable runtime directories under userData', {
      storagePath: this.state.laravelStoragePath,
      storageSeedPath: this.state.laravelStorageSeedAppPath,
      bootstrapCachePath: this.state.bootstrapCachePath,
      mysqlDataDir: this.state.mysqlDataDir,
      logsDir: this.logsDir,
    });
  }

  copyDirectoryContents(sourcePath, targetPath) {
    ensureDir(targetPath);
    const entries = fs.readdirSync(sourcePath, { withFileTypes: true });

    for (const entry of entries) {
      const sourceEntryPath = path.join(sourcePath, entry.name);
      const targetEntryPath = path.join(targetPath, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectoryContents(sourceEntryPath, targetEntryPath);
      } else if (entry.isFile()) {
        ensureDir(path.dirname(targetEntryPath));
        fs.copyFileSync(sourceEntryPath, targetEntryPath);
      }
    }
  }

  directoryHasMeaningfulEntries(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return false;
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.gitignore') {
        continue;
      }

      const entryPath = path.join(targetPath, entry.name);
      if (entry.isFile()) {
        return true;
      }

      if (entry.isDirectory() && this.directoryHasMeaningfulEntries(entryPath)) {
        return true;
      }
    }

    return false;
  }

  seedBundledLaravelAppStorageIfNeeded() {
    const targetAppPath = path.join(this.state.laravelStoragePath, 'app');
    const publicAppPath = path.join(targetAppPath, 'public');
    const privateAppPath = path.join(targetAppPath, 'private');

    if (!this.isPackaged) {
      ensureDir(targetAppPath);
      ensureDir(publicAppPath);
      ensureDir(privateAppPath);
      return;
    }

    if (fs.existsSync(this.state.laravelStorageSeedMarker)) {
      ensureDir(targetAppPath);
      ensureDir(publicAppPath);
      ensureDir(privateAppPath);
      return;
    }

    if (!fs.existsSync(this.state.laravelStorageSeedAppPath)) {
      throw new RuntimeStageError('ensure writable runtime directories exist', 'Packaged Laravel storage seed missing', {
        missingPath: this.state.laravelStorageSeedAppPath,
      });
    }

    if (this.directoryHasMeaningfulEntries(targetAppPath)) {
      const markerPayload = {
        status: 'existing-userdata-retained',
        recordedAt: new Date().toISOString(),
        targetAppPath,
      };
      fs.writeFileSync(this.state.laravelStorageSeedMarker, JSON.stringify(markerPayload, null, 2), 'utf8');
      this.logger.info('Detected existing userData Laravel app storage and left it in place.', markerPayload);
      ensureDir(publicAppPath);
      ensureDir(privateAppPath);
      return;
    }

    this.copyDirectoryContents(this.state.laravelStorageSeedAppPath, targetAppPath);
    ensureDir(publicAppPath);
    ensureDir(privateAppPath);

    const markerPayload = {
      status: 'seeded-from-packaged-storage',
      seededAt: new Date().toISOString(),
      sourceAppPath: this.state.laravelStorageSeedAppPath,
      targetAppPath,
    };
    fs.writeFileSync(this.state.laravelStorageSeedMarker, JSON.stringify(markerPayload, null, 2), 'utf8');
    this.logger.info('Seeded Laravel app storage into userData from the packaged storage seed.', markerPayload);
  }

  directoryHasEntries(targetPath) {
    return fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0;
  }

  mysqlDataLooksInitialized() {
    const sentinelPaths = [
      path.join(this.state.mysqlDataDir, 'mysql'),
      path.join(this.state.mysqlDataDir, 'ibdata1'),
      path.join(this.state.mysqlDataDir, 'auto.cnf'),
    ];
    return sentinelPaths.some((candidate) => fs.existsSync(candidate));
  }

  resetDirectory(targetPath) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    fs.mkdirSync(targetPath, { recursive: true });
  }

  cleanPartialDbInitialization(reason) {
    this.logger.warn('Cleaning partial MariaDB initialization state', {
      reason,
      mysqlDataDir: this.state.mysqlDataDir,
    });
    this.resetDirectory(this.state.mysqlDataDir);
    if (fs.existsSync(this.state.mysqlInitMarker)) {
      fs.rmSync(this.state.mysqlInitMarker, { force: true });
    }
  }

  async initializeDbDataIfNeeded() {
    if (!this.state.manageMysql) {
      this.logger.info('Skipping managed MariaDB initialization because development mode is using an external DB runtime.');
      return;
    }

    ensureDir(this.state.mysqlDataDir);

    const alreadyInitialized = fs.existsSync(this.state.mysqlInitMarker) && this.mysqlDataLooksInitialized();
    if (alreadyInitialized) {
      this.logger.info('MariaDB datadir already initialized', {
        markerPath: this.state.mysqlInitMarker,
        datadir: this.state.mysqlDataDir,
      });
      return;
    }

    if (!fs.existsSync(this.state.mysqlInstallDb)) {
      throw new RuntimeStageError('initialize DB data if first run', 'MariaDB initialization failed', {
        missingPath: this.state.mysqlInstallDb,
        error: 'mysql_install_db.exe is required for this MariaDB runtime bootstrap path.',
      });
    }

    if (!fs.existsSync(this.state.mysqlInitMarker) && this.directoryHasEntries(this.state.mysqlDataDir)) {
      this.cleanPartialDbInitialization('stale unmarked data directory before initialization');
    }

    const initArgs = [
      '--datadir',
      this.state.mysqlDataDir,
      '--port',
      String(this.ports.db),
      '--verbose-bootstrap',
    ];
    this.logger.info('Initializing MariaDB datadir', {
      command: this.state.mysqlInstallDb,
      args: initArgs,
      cwd: this.state.mysqlBinDir,
      datadir: this.state.mysqlDataDir,
      selectedPort: this.ports.db,
    });

    const initResult = this.runCommandCapture(this.state.mysqlInstallDb, initArgs, {
      cwd: this.state.mysqlBinDir,
      env: process.env,
    });
    this.logger.writeProcessSection('mysql', `${this.state.mysqlInstallDb} ${initArgs.join(' ')}`, `${initResult.stdout || ''}${initResult.stderr || ''}`);

    if (initResult.error || initResult.status !== 0) {
      this.cleanPartialDbInitialization('initialization command failed');
      throw new RuntimeStageError('initialize DB data if first run', 'MariaDB initialization failed', {
        exitCode: initResult.status,
        error: initResult.error ? initResult.error.message : summarizeOutput(initResult.stderr || initResult.stdout),
      });
    }

    if (!this.mysqlDataLooksInitialized()) {
      this.cleanPartialDbInitialization('bootstrap completed without creating required sentinel files');
      throw new RuntimeStageError('initialize DB data if first run', 'MariaDB initialization failed', {
        error: 'MariaDB bootstrap completed without creating mysql system tables or InnoDB sentinel files.',
      });
    }

    this.logger.info('MariaDB datadir initialization completed', {
      datadir: this.state.mysqlDataDir,
      selectedPort: this.ports.db,
    });
  }

  buildMariaDbConfig() {
    const basedir = normalizeForIni(this.state.mysqlDir);
    const datadir = normalizeForIni(this.state.mysqlDataDir);
    const pidFile = normalizeForIni(path.join(this.state.mysqlRunDir, 'mysqld.pid'));
    const logFile = normalizeForIni(this.logger.paths.mysql);
    const tmpdir = normalizeForIni(this.state.mysqlTempDir);
    const pluginDir = normalizeForIni(path.join(this.state.mysqlDir, 'lib', 'plugin'));
    const messagesDir = normalizeForIni(path.join(this.state.mysqlDir, 'share'));

    return [
      '[client]',
      'host=127.0.0.1',
      `port=${this.ports.db}`,
      'protocol=tcp',
      '',
      '[mysqld]',
      `basedir="${basedir}"`,
      `datadir="${datadir}"`,
      `port=${this.ports.db}`,
      'bind-address=127.0.0.1',
      `pid_file="${pidFile}"`,
      `log_error="${logFile}"`,
      `tmpdir="${tmpdir}"`,
      `plugin_dir="${pluginDir}"`,
      `lc-messages-dir="${messagesDir}"`,
      'skip-name-resolve=1',
      'character-set-server=utf8mb4',
      'collation-server=utf8mb4_unicode_ci',
      'default-time-zone=+00:00',
      'max_connections=50',
      '',
    ].join('\r\n');
  }

  buildMariaDbStartArgs() {
    const basedir = normalizeForIni(this.state.mysqlDir);
    const datadir = normalizeForIni(this.state.mysqlDataDir);
    const pidFile = normalizeForIni(path.join(this.state.mysqlRunDir, 'mysqld.pid'));
    const logFile = normalizeForIni(this.logger.paths.mysql);

    return [
      `--basedir=${basedir}`,
      `--datadir=${datadir}`,
      `--port=${this.ports.db}`,
      '--bind-address=127.0.0.1',
      `--pid-file=${pidFile}`,
      `--log-error=${logFile}`,
      '--skip-name-resolve=1',
      '--character-set-server=utf8mb4',
      '--collation-server=utf8mb4_unicode_ci',
      '--default-time-zone=+00:00',
      '--max_connections=50',
      '--console',
    ];
  }

  async startMariaDb() {
    if (!this.state.manageMysql) {
      this.logger.info('Skipping managed MariaDB startup because development mode is using an external DB runtime.');
      return;
    }

    const portInUse = await probeTcpPort('127.0.0.1', this.ports.db, 1500);
    if (portInUse) {
      throw new RuntimeStageError('start MariaDB', 'MariaDB port conflict', {
        port: this.ports.db,
        host: '127.0.0.1',
      });
    }

    fs.writeFileSync(this.state.mysqlConfigPath, this.buildMariaDbConfig(), 'utf8');

    const args = this.buildMariaDbStartArgs();
    this.logger.info('Starting MariaDB process', {
      command: this.state.mysqld,
      args,
      cwd: this.state.mysqlDir,
      configPath: this.state.mysqlConfigPath,
      datadir: this.state.mysqlDataDir,
      selectedPort: this.ports.db,
      startupMode: 'explicit-args-with-generated-config',
      stdoutLog: this.logger.paths.mysql,
      stderrLog: this.logger.paths.mysql,
    });

    this.mysqlProcess = this.spawnLoggedProcess('mysql', this.state.mysqld, args, {
      cwd: this.state.mysqlDir,
      env: process.env,
    });
  }

  isChildRunning(childProcess) {
    return !!childProcess && childProcess.exitCode === null && childProcess.signalCode === null;
  }

  runMysqlAdmin(args) {
    return this.runCommandCapture(this.state.mysqladmin, args, {
      cwd: this.state.mysqlDir,
      env: process.env,
    });
  }

  runMysqlQuery(sql) {
    return this.runCommandCapture(this.state.mysql, [
      '--protocol=tcp',
      '-h127.0.0.1',
      `-P${this.ports.db}`,
      '-uroot',
      '--batch',
      '--skip-column-names',
      '-e',
      sql,
    ], {
      cwd: this.state.mysqlDir,
      env: process.env,
    });
  }

  async waitForMariaDbReady() {
    if (!this.state.manageMysql) {
      this.logger.info('Skipping MariaDB readiness wait because development mode is using an external DB runtime.');
      return;
    }

    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime <= MYSQL_READY_TIMEOUT_MS) {
      attempt += 1;

      if (!this.isChildRunning(this.mysqlProcess)) {
        throw new RuntimeStageError('wait for real DB readiness', 'MariaDB readiness failed', {
          exitCode: this.mysqlProcess ? this.mysqlProcess.exitCode : null,
          signal: this.mysqlProcess ? this.mysqlProcess.signalCode : null,
        });
      }

      const portReachable = await probeTcpPort('127.0.0.1', this.ports.db, 1500);
      if (!portReachable) {
        this.logger.info('MariaDB readiness retry: TCP port not open yet', {
          attempt,
          port: this.ports.db,
          elapsedMs: Date.now() - startTime,
        });
        await delay(1000);
        continue;
      }

      const pingResult = this.runMysqlAdmin([
        'ping',
        '--protocol=tcp',
        '-h127.0.0.1',
        `-P${this.ports.db}`,
        '-uroot',
        '--silent',
      ]);
      if (pingResult.error || pingResult.status !== 0) {
        this.logger.info('MariaDB readiness retry: mysqladmin ping failed', {
          attempt,
          exitCode: pingResult.status,
          error: pingResult.error ? pingResult.error.message : summarizeOutput(pingResult.stderr || pingResult.stdout),
        });
        await delay(1000);
        continue;
      }

      const queryResult = this.runMysqlQuery('CREATE DATABASE IF NOT EXISTS `laravel` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; SELECT 1;');
      if (queryResult.error || queryResult.status !== 0) {
        this.logger.info('MariaDB readiness retry: authentication or ping query failed', {
          attempt,
          exitCode: queryResult.status,
          error: queryResult.error ? queryResult.error.message : summarizeOutput(queryResult.stderr || queryResult.stdout),
        });
        await delay(1000);
        continue;
      }

      fs.writeFileSync(this.state.mysqlInitMarker, JSON.stringify({
        initializedAt: new Date().toISOString(),
        datadir: this.state.mysqlDataDir,
        port: this.ports.db,
      }, null, 2), 'utf8');

      this.logger.info('MariaDB readiness checks passed', {
        port: this.ports.db,
        attempts: attempt,
        mysqlConfigPath: this.state.mysqlConfigPath,
        datadir: this.state.mysqlDataDir,
      });
      return;
    }

    throw new RuntimeStageError('wait for real DB readiness', 'MariaDB readiness failed', {
      port: this.ports.db,
      timeoutMs: MYSQL_READY_TIMEOUT_MS,
      attempts: attempt,
    });
  }

  runArtisanSync(args, label) {
    const result = this.runCommandCapture(this.state.phpBin, args, {
      cwd: this.state.laravelRoot,
      env: this.childEnv,
    });
    this.logger.writeProcessSection('php', `${label} (${this.state.phpBin} ${args.join(' ')})`, `${result.stdout || ''}${result.stderr || ''}`);
    return result;
  }

  async startLaravelServer() {
    const optimizeClearArgs = ['artisan', 'optimize:clear'];
    this.logger.info('Clearing Laravel bootstrap caches before HTTP server start', {
      command: this.state.phpBin,
      args: optimizeClearArgs,
      cwd: this.state.laravelRoot,
      storagePath: this.state.laravelStoragePath,
      bootstrapCachePath: this.state.bootstrapCachePath,
    });

    const optimizeClearResult = this.runArtisanSync(optimizeClearArgs, 'artisan optimize:clear');
    if (optimizeClearResult.error || optimizeClearResult.status !== 0) {
      throw new RuntimeStageError('start Laravel HTTP server', 'Laravel bootstrap cache clear failed', {
        exitCode: optimizeClearResult.status,
        error: optimizeClearResult.error ? optimizeClearResult.error.message : summarizeOutput(optimizeClearResult.stderr || optimizeClearResult.stdout),
      });
    }

    const serveArgs = ['artisan', 'serve', '--host=127.0.0.1', `--port=${this.ports.server}`];
    this.logger.info('Starting Laravel HTTP server', {
      command: this.state.phpBin,
      args: serveArgs,
      cwd: this.state.laravelRoot,
      baseUrl: this.localBackendBaseUrl,
      stdoutLog: this.logger.paths.php,
      stderrLog: this.logger.paths.php,
    });

    this.serverProcess = this.spawnLoggedProcess('php', this.state.phpBin, serveArgs, {
      cwd: this.state.laravelRoot,
      env: this.childEnv,
    });
  }

  async waitForLaravelReady() {
    const url = `${this.localBackendBaseUrl}/up`;
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime <= LARAVEL_READY_TIMEOUT_MS) {
      attempt += 1;

      if (!this.isChildRunning(this.serverProcess)) {
        throw new RuntimeStageError('wait for Laravel health endpoint', 'Laravel health endpoint failed', {
          exitCode: this.serverProcess ? this.serverProcess.exitCode : null,
          signal: this.serverProcess ? this.serverProcess.signalCode : null,
          url,
        });
      }

      try {
        const statusCode = await requestStatus(url, 5000);
        if (statusCode > 0 && statusCode < 400) {
          this.logger.info('Laravel health endpoint is reachable', {
            url,
            statusCode,
            attempts: attempt,
          });
          return;
        }

        this.logger.info('Laravel health endpoint retry: non-ready status', {
          attempt,
          url,
          statusCode,
          elapsedMs: Date.now() - startTime,
        });
      } catch (error) {
        this.logger.info('Laravel health endpoint retry: request failed', {
          attempt,
          url,
          error: error && error.message ? error.message : String(error),
          elapsedMs: Date.now() - startTime,
        });
      }

      await delay(1000);
    }

    throw new RuntimeStageError('wait for Laravel health endpoint', 'Laravel health endpoint failed', {
      url,
      timeoutMs: LARAVEL_READY_TIMEOUT_MS,
      attempts: attempt,
    });
  }

  async startReverb() {
    const reverbArgs = [
      'artisan',
      'reverb:start',
      '--host=127.0.0.1',
      `--port=${this.ports.reverb}`,
      '--hostname=127.0.0.1',
    ];
    this.logger.info('Starting Reverb server', {
      command: this.state.phpBin,
      args: reverbArgs,
      cwd: this.state.laravelRoot,
      port: this.ports.reverb,
      stdoutLog: this.logger.paths.reverb,
      stderrLog: this.logger.paths.reverb,
    });

    this.reverbProcess = this.spawnLoggedProcess('reverb', this.state.phpBin, reverbArgs, {
      cwd: this.state.laravelRoot,
      env: this.childEnv,
    });

    const startTime = Date.now();
    let attempt = 0;
    while (Date.now() - startTime <= REVERB_READY_TIMEOUT_MS) {
      attempt += 1;

      if (!this.isChildRunning(this.reverbProcess)) {
        throw new RuntimeStageError('start Reverb', 'Reverb failed to start', {
          exitCode: this.reverbProcess ? this.reverbProcess.exitCode : null,
          signal: this.reverbProcess ? this.reverbProcess.signalCode : null,
        });
      }

      const portReachable = await probeTcpPort('127.0.0.1', this.ports.reverb, 1500);
      if (portReachable) {
        this.logger.info('Reverb port is reachable', {
          port: this.ports.reverb,
          attempts: attempt,
        });
        return;
      }

      this.logger.info('Reverb readiness retry: port not open yet', {
        attempt,
        port: this.ports.reverb,
        elapsedMs: Date.now() - startTime,
      });
      await delay(1000);
    }

    throw new RuntimeStageError('start Reverb', 'Reverb failed to start', {
      port: this.ports.reverb,
      timeoutMs: REVERB_READY_TIMEOUT_MS,
    });
  }

  runCommandCapture(command, args, options = {}) {
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

  setProcessDebugState(key, childProcess, extra = {}) {
    this.debugState.processes[key] = {
      pid: childProcess && childProcess.pid ? childProcess.pid : null,
      ...extra,
    };
    this.persistDebugState();
  }

  spawnLoggedProcess(logKey, command, args, options = {}) {
    const logStream = this.logger.openProcessStream(logKey);
    const childProcess = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      detached: false,
    });

    const descriptor = `${command} ${args.join(' ')}`;
    logStream.write(`\n[${new Date().toISOString()}] COMMAND ${descriptor}\n`);
    logStream.write(`[${new Date().toISOString()}] CWD ${options.cwd || process.cwd()}\n`);

    this.logger.info('Spawned child process', {
      command,
      args,
      cwd: options.cwd || process.cwd(),
      pid: childProcess.pid || null,
      stdoutLog: this.logger.paths[logKey],
      stderrLog: this.logger.paths[logKey],
    });
    this.setProcessDebugState(logKey, childProcess, {
      command,
      args,
      cwd: options.cwd || process.cwd(),
    });

    if (childProcess.stdout) {
      childProcess.stdout.on('data', (chunk) => {
        logStream.write(chunk);
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (chunk) => {
        logStream.write(chunk);
      });
    }

    childProcess.on('error', (error) => {
      logStream.write(`\n[${new Date().toISOString()}] PROCESS ERROR ${error.message}\n`);
      this.logger.error('Child process emitted an error', {
        command,
        pid: childProcess.pid || null,
        error: error.message,
      });
      this.setProcessDebugState(logKey, childProcess, {
        command,
        args,
        cwd: options.cwd || process.cwd(),
        error: error.message,
      });
    });

    childProcess.on('close', (code, signal) => {
      logStream.write(`\n[${new Date().toISOString()}] EXIT code=${code} signal=${signal || ''}\n`);
      this.logger.info('Child process exited', {
        command,
        pid: childProcess.pid || null,
        exitCode: code,
        signal: signal || null,
      });
      this.setProcessDebugState(logKey, childProcess, {
        command,
        args,
        cwd: options.cwd || process.cwd(),
        exitCode: code,
        signal: signal || null,
      });
    });

    return childProcess;
  }

  terminateChildProcess(label, childProcess) {
    if (!childProcess || !childProcess.pid) {
      return;
    }

    this.logger.info('Stopping child process', {
      label,
      pid: childProcess.pid,
    });

    try {
      const result = spawnSync('taskkill', ['/pid', String(childProcess.pid), '/f', '/t'], {
        windowsHide: true,
        detached: false,
        encoding: 'utf8',
      });

      if (result.error) {
        throw result.error;
      }

      if (typeof result.status === 'number' && result.status !== 0) {
        this.logger.warn('taskkill returned a non-zero exit code while stopping child process', {
          label,
          pid: childProcess.pid,
          exitCode: result.status,
          output: summarizeOutput(`${result.stdout || ''}${result.stderr || ''}`),
        });
      }
    } catch (error) {
      this.logger.warn('Failed to stop child process cleanly', {
        label,
        pid: childProcess.pid,
        error: error && error.message ? error.message : String(error),
      });
    }
  }

  shutdown() {
    this.terminateChildProcess('Reverb', this.reverbProcess);
    this.terminateChildProcess('Laravel HTTP server', this.serverProcess);
    this.terminateChildProcess('MariaDB', this.mysqlProcess);
    this.logger.close();
  }
}

function formatRuntimeError(error, logsDir) {
  const fallbackMessage = error && error.message ? error.message : String(error);
  if (error && error.details && error.details.dependencyFailure) {
    const dependencyText = error.details.dependencyDll ? ` (${error.details.dependencyDll})` : '';
    const commandText = error.details.command ? ` Command: ${error.details.command}.` : '';
    return `${error.stage}: ${error.reason}${dependencyText}. PHP: ${error.details.phpBin}.${commandText} Check logs in ${logsDir}.`;
  }
  if (error && error.stage && error.reason) {
    return `${error.stage}: ${error.reason}. Check logs in ${logsDir}.`;
  }
  return `${fallbackMessage}. Check logs in ${logsDir}.`;
}

module.exports = {
  PACKAGED_PORTS,
  RuntimeOrchestrator,
  RuntimeStageError,
  formatRuntimeError,
  REQUIRED_PHP_EXTENSION_FILES,
  REQUIRED_PHP_EXTENSIONS,
};
