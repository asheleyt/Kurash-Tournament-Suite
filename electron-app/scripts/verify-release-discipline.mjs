import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronAppDir = resolve(__dirname, '..');
const buildOutputDir = join(electronAppDir, 'build-output');
const packageJsonPath = join(electronAppDir, 'package.json');
const installerIncludePath = join(electronAppDir, 'build', 'installer.nsh');
const runtimeManifestPath = join(buildOutputDir, 'win-unpacked', 'resources', 'portable', 'runtime', 'runtime-manifest.json');
const duplicatePhpFolderPath = join(buildOutputDir, 'win-unpacked', 'resources', 'portable', 'runtime', 'php', 'windowsXamppPhp');
const pintPackagePath = join(buildOutputDir, 'win-unpacked', 'resources', 'laravel', 'vendor', 'laravel', 'pint');
const expectedExcludedPhpEntries = ['CompatInfo', 'data', 'dev', 'docs', 'extras', 'scripts', 'tests', 'windowsXamppPhp'];

function readJsonFile(targetPath, label) {
  if (!existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }

  try {
    return JSON.parse(readFileSync(targetPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse ${label}: ${targetPath}. ${error.message}`);
  }
}

function expandInstallerArtifactName(packageJson) {
  const pattern = packageJson.build?.nsis?.artifactName || '${productName} Setup ${version}.${ext}';
  const values = {
    productName: packageJson.build?.productName || packageJson.productName || packageJson.name,
    version: packageJson.version,
    ext: 'exe',
    name: packageJson.name,
  };

  return pattern.replace(/\$\{(\w+)\}/g, (_match, key) => (key in values ? values[key] : ''));
}

const packageJson = readJsonFile(packageJsonPath, 'electron-app package.json');
const installerIncludeText = existsSync(installerIncludePath) ? readFileSync(installerIncludePath, 'utf8') : '';
const installerPath = join(buildOutputDir, expandInstallerArtifactName(packageJson));
const legacyInstallerPath = join(
  buildOutputDir,
  `${packageJson.build?.productName || packageJson.productName || packageJson.name} ${packageJson.version}.exe`
);
const portableValidationPath = join(buildOutputDir, 'portable-validation-results.json');
const baselinePath = join(buildOutputDir, 'distribution-baseline.local.json');
const sizeAnalysisPath = join(buildOutputDir, 'distribution-size-analysis.local.json');

const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

check(existsSync(installerPath), `Missing expected NSIS installer artifact: ${installerPath}`);
check(!existsSync(legacyInstallerPath), `Legacy installer artifact should not remain in build-output: ${legacyInstallerPath}`);
check(packageJson.build?.nsis?.oneClick === false, 'Expected NSIS installer to stay in assisted mode (oneClick: false).');
check(packageJson.build?.nsis?.perMachine === false, 'Expected assisted installer to keep per-user install as the default mode.');
check(packageJson.build?.nsis?.selectPerMachineByDefault !== true, 'Expected per-machine install to remain unselected by default.');
check(packageJson.build?.nsis?.allowToChangeInstallationDirectory === true, 'Expected assisted installer to allow install-directory choice.');
check(packageJson.build?.nsis?.createDesktopShortcut === false, 'Expected desktop shortcut creation to be handled by the explicit installer choice flow.');
check(packageJson.build?.nsis?.createStartMenuShortcut !== false, 'Expected Start Menu shortcut creation to remain enabled.');
check(packageJson.build?.nsis?.runAfterFinish !== false, 'Expected finish-page launch-after-install behavior to remain enabled.');
check(installerIncludeText.includes('DesktopShortcutChoicePageCreate'), 'Expected installer.nsh to define the desktop shortcut choice page.');
check(
  installerIncludeText.includes('Create a desktop shortcut named KTS Controller'),
  'Expected installer.nsh to offer an explicit "Create a desktop shortcut named KTS Controller" checkbox.'
);
check(
  installerIncludeText.includes('DesktopShortcutChoice'),
  'Expected installer.nsh to persist the desktop shortcut choice for reinstall/uninstall handling.'
);

let portableValidation = null;
let baseline = null;
let runtimeManifest = null;
let sizeAnalysis = null;

try {
  portableValidation = readJsonFile(portableValidationPath, 'packaged bootstrap validation results');
} catch (error) {
  failures.push(error.message);
}

try {
  baseline = readJsonFile(baselinePath, 'distribution baseline');
} catch (error) {
  failures.push(error.message);
}

try {
  runtimeManifest = readJsonFile(runtimeManifestPath, 'runtime manifest');
} catch (error) {
  failures.push(error.message);
}

try {
  sizeAnalysis = readJsonFile(sizeAnalysisPath, 'distribution size analysis');
} catch (error) {
  failures.push(error.message);
}

if (portableValidation) {
  check(portableValidation.validationPassed === true, 'Packaged bootstrap validation must pass.');
}

if (baseline) {
  check(baseline.metricScope === 'local-baseline', `Expected metricScope to be "local-baseline", got "${baseline.metricScope}".`);
  check(baseline.installedPayloadSource === 'temp-install', `Expected installedPayloadSource to be "temp-install", got "${baseline.installedPayloadSource}".`);
  check(baseline.tempInstallMaterialized === true, 'Expected tempInstallMaterialized to be true.');
  check(baseline.launchMetricsSource === 'installed-payload-harness', `Expected launchMetricsSource to be "installed-payload-harness", got "${baseline.launchMetricsSource}".`);
  check(baseline.validation?.installedPayloadHarness?.validationPassed === true, 'Installed payload harness validation must pass.');
  check(baseline.userDataIsolation?.defaultUserDataUntouched === true, 'Default user data must remain untouched during baseline measurement.');
  check(baseline.cleanupVerification?.installDirectoryRemoved === true, 'Install directory cleanup must succeed.');
  check(baseline.cleanupVerification?.installedValidationRunRootRemoved === true, 'Installed validation run-root cleanup must succeed.');
  check(baseline.cleanupVerification?.measurementRootRemoved === true, 'Measurement root cleanup must succeed.');
  check(baseline.cleanupVerification?.installedValidationResultsRemoved === true, 'Installed validation results cleanup must succeed.');
  check((baseline.iconSelection?.selectedIcoPath || '').endsWith('KTS_Icon.ico'), `Expected selected ICO path to end with "KTS_Icon.ico", got "${baseline.iconSelection?.selectedIcoPath || ''}".`);
  check(baseline.iconSelection?.isMultiSizeWindowsIco === true, 'Selected ICO must remain multi-size.');
  check(typeof baseline.firstLaunchDurationMs === 'number' && baseline.firstLaunchDurationMs > 0, 'First-launch timing must be present.');
  check(typeof baseline.relaunchDurationMs === 'number' && baseline.relaunchDurationMs > 0, 'Relaunch timing must be present.');
}

if (runtimeManifest) {
  for (const entry of expectedExcludedPhpEntries) {
    check(
      Array.isArray(runtimeManifest.excludedPhpTopLevelEntries) &&
        runtimeManifest.excludedPhpTopLevelEntries.includes(entry),
      `Runtime manifest must record ${entry} as an excluded PHP top-level payload.`
    );
  }
}

check(!existsSync(duplicatePhpFolderPath), `Duplicate PHP payload should not exist in packaged runtime: ${duplicatePhpFolderPath}`);
check(!existsSync(pintPackagePath), `Laravel Pint should be excluded from the packaged vendor payload: ${pintPackagePath}`);
for (const entry of expectedExcludedPhpEntries.filter((entry) => entry !== 'windowsXamppPhp')) {
  check(
    !existsSync(join(buildOutputDir, 'win-unpacked', 'resources', 'portable', 'runtime', 'php', entry)),
    `Excluded PHP top-level entry should not exist in packaged runtime: ${entry}`
  );
}

if (sizeAnalysis) {
  check(sizeAnalysis.metricScope === 'local-size-analysis', `Expected size analysis metricScope to be "local-size-analysis", got "${sizeAnalysis.metricScope}".`);
  check(
    sizeAnalysis.phpRuntime?.nestedWindowsXamppPhp?.totalBytes === 0,
    `Expected nested windowsXamppPhp payload size to be 0 bytes, got "${sizeAnalysis.phpRuntime?.nestedWindowsXamppPhp?.totalBytes}".`
  );
  check(
    sizeAnalysis.phpRuntime?.nestedWindowsXamppPhp?.exactDuplicateBytes === 0,
    `Expected exact duplicate PHP bytes under windowsXamppPhp to be 0, got "${sizeAnalysis.phpRuntime?.nestedWindowsXamppPhp?.exactDuplicateBytes}".`
  );
  check(
    sizeAnalysis.vendorPayload?.pintBinary === null,
    'Expected size analysis to show Laravel Pint as absent from the packaged vendor payload.'
  );
}

check(packageJson.build?.nsis?.shortcutName === 'KTS Controller', `Expected shortcutName to remain "KTS Controller", got "${packageJson.build?.nsis?.shortcutName}".`);

if (failures.length > 0) {
  console.error('[verify-release-discipline] Release discipline checks failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('[verify-release-discipline] Release discipline checks passed.');
console.log(` - Installer: ${installerPath}`);
console.log(` - Installer mode: ${packageJson.build?.nsis?.oneClick === false ? 'assisted' : 'one-click'}`);
console.log(` - Per-user default: ${packageJson.build?.nsis?.perMachine === false ? 'yes' : 'no'}`);
console.log(` - Install location choice: ${packageJson.build?.nsis?.allowToChangeInstallationDirectory === true ? 'enabled' : 'disabled'}`);
console.log(` - Shortcut label: ${packageJson.build?.nsis?.shortcutName}`);
console.log(' - Desktop shortcut flow: explicit installer choice');
console.log(` - Payload source: ${baseline.installedPayloadSource}`);
console.log(` - Launch metrics source: ${baseline.launchMetricsSource}`);
console.log(` - First launch: ${baseline.firstLaunchDurationMs} ms`);
console.log(` - Relaunch: ${baseline.relaunchDurationMs} ms`);
console.log(` - Duplicate PHP payload trimmed: ${!existsSync(duplicatePhpFolderPath) ? 'yes' : 'no'}`);
console.log(` - Laravel Pint packaged: ${existsSync(pintPackagePath) ? 'yes' : 'no'}`);
console.log(` - Icon source: ${baseline.iconSelection?.selectedIcoPath}`);
