const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function findPackagedExe(appOutDir) {
  const preferred = path.join(appOutDir, 'Kurash Scoreboard.exe');
  if (fs.existsSync(preferred)) return preferred;

  const entry = fs
    .readdirSync(appOutDir, { withFileTypes: true })
    .find((item) => item.isFile() && item.name.toLowerCase().endsWith('.exe'));

  return entry ? path.join(appOutDir, entry.name) : null;
}

exports.default = async function stampWindowsIcon(context) {
  if (context.electronPlatformName !== 'win32') return;

  const electronAppDir = context.packager.projectDir;
  const rceditPath = path.join(
    electronAppDir,
    'node_modules',
    'electron-winstaller',
    'vendor',
    'rcedit.exe',
  );
  const iconPath = path.join(electronAppDir, 'build-resources', 'KTS_Icon.ico');
  const exePath = findPackagedExe(context.appOutDir);

  if (!exePath) {
    throw new Error(`[stamp-windows-icon] No packaged exe found in ${context.appOutDir}`);
  }
  if (!fs.existsSync(iconPath)) {
    throw new Error(`[stamp-windows-icon] Missing icon file: ${iconPath}`);
  }
  if (!fs.existsSync(rceditPath)) {
    throw new Error(`[stamp-windows-icon] Missing rcedit.exe: ${rceditPath}`);
  }

  const result = spawnSync(
    rceditPath,
    [
      exePath,
      '--set-icon',
      iconPath,
      '--set-version-string',
      'CompanyName',
      'Kurash Tournament Suite',
      '--set-version-string',
      'FileDescription',
      'Kurash Tournament Suite',
      '--set-version-string',
      'ProductName',
      'Kurash Tournament Suite',
    ],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `[stamp-windows-icon] rcedit failed for ${exePath}`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  console.log(`[stamp-windows-icon] Stamped KTS icon into ${exePath}`);
};
