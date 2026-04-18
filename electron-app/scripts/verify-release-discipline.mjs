import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronAppDir = resolve(__dirname, '..');
const buildOutputDir = join(electronAppDir, 'build-output');
const packageJsonPath = join(electronAppDir, 'package.json');

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
const installerPath = join(buildOutputDir, expandInstallerArtifactName(packageJson));
const legacyInstallerPath = join(
  buildOutputDir,
  `${packageJson.build?.productName || packageJson.productName || packageJson.name} ${packageJson.version}.exe`
);
const portableValidationPath = join(buildOutputDir, 'portable-validation-results.json');
const baselinePath = join(buildOutputDir, 'distribution-baseline.local.json');

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
check(packageJson.build?.nsis?.createDesktopShortcut === true, 'Expected desktop shortcut creation to remain user-selectable and default-on.');
check(packageJson.build?.nsis?.createStartMenuShortcut !== false, 'Expected Start Menu shortcut creation to remain enabled.');
check(packageJson.build?.nsis?.runAfterFinish !== false, 'Expected finish-page launch-after-install behavior to remain enabled.');

let portableValidation = null;
let baseline = null;

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
console.log(` - Payload source: ${baseline.installedPayloadSource}`);
console.log(` - Launch metrics source: ${baseline.launchMetricsSource}`);
console.log(` - First launch: ${baseline.firstLaunchDurationMs} ms`);
console.log(` - Relaunch: ${baseline.relaunchDurationMs} ms`);
console.log(` - Icon source: ${baseline.iconSelection?.selectedIcoPath}`);
