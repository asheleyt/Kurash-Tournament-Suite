# Windows Release Checklist

## Scope

This checklist is for the current Windows packaging pass only:

- NSIS installer output
- packaged runtime/bootstrap confidence
- explicit desktop shortcut choice and shortcut readability
- uninstall and cleanup review
- local size-analysis evidence

This checklist does not cover signing, public/web branding, or broad payload-trimming policy decisions.

## Automated local evidence

Run these from a normal local shell before a Windows packaging handoff:

1. `npm run build:electron:nsis`
2. `npm run measure:electron:baseline`
3. `npm run analyze:electron:size`
4. `npm run verify:electron:release-discipline`

Expected local evidence artifacts:

- `electron-app/build-output/KTS-Setup-<version>.exe`
- `electron-app/build-output/portable-validation-results.json`
- `electron-app/build-output/distribution-baseline.local.json`
- `electron-app/build-output/distribution-size-analysis.local.json`

Expected baseline conditions:

- `installedPayloadSource: temp-install`
- `launchMetricsSource: installed-payload-harness`
- `validation.installedPayloadHarness.validationPassed: true`
- `userDataIsolation.defaultUserDataUntouched: true`

Expected size-analysis conditions:

- `metricScope: local-size-analysis`
- `appAsar.totalBytes` is present
- `phpRuntime.nestedWindowsXamppPhp.exactDuplicateBytes: 0`
- `phpRuntime.nestedWindowsXamppPhp.totalBytes: 0`
- `vendorPayload.pintBinary: null`
- `vendorPayload.largestPackages` is present

## Manual installer UX checks

- Install from `electron-app/build-output/KTS-Setup-<version>.exe`
- Confirm the installer uses the assisted wizard flow rather than one-click
- Confirm per-user install remains the default selection on the install-mode page
- Confirm install-location choice is available and the default path looks sensible
- Confirm the explicit desktop shortcut choice page appears
- Confirm the desktop shortcut checkbox is checked by default on a fresh install
- Confirm unchecking the desktop shortcut checkbox results in no desktop shortcut after install
- Confirm checking the desktop shortcut checkbox results in a desktop shortcut named `KTS Controller`
- Confirm the shortcut icon and installed app icon use the KTS controller ICO
- Confirm the finish page shows launch-after-install and it is checked by default
- Confirm no Windows boot auto-start option appears anywhere in the installer
- Confirm first launch reaches the ready state without extra setup steps
- Confirm relaunch reaches ready state cleanly
- Confirm recovery launch still reaches ready state after a forced-close style interruption

## Manual uninstall checks

- Run uninstall from Windows Apps/Installed Apps or the generated uninstaller
- Confirm installed app files are removed from the install directory
- Confirm shortcut cleanup is correct whether or not the desktop shortcut was chosen
- Confirm `%APPDATA%\Kurash Scoreboard` is preserved unless a separate migration plan says otherwise

## Release discipline checks

- Confirm no stale legacy installer artifact remains in `electron-app/build-output`
- Confirm the active packaging icon source remains `electron-app/build-resources/KTS_Icon.ico`
- Confirm the packaged runtime does not contain `resources/portable/runtime/php/windowsXamppPhp`
- Confirm the packaged runtime does not contain `resources/portable/runtime/php/CompatInfo`, `data`, `dev`, `docs`, `extras`, `scripts`, or `tests`
- Confirm the packaged vendor payload does not contain `resources/laravel/vendor/laravel/pint`
- Confirm the local baseline JSON was regenerated in the same pass as the installer build being reviewed
- Confirm the local size-analysis JSON was regenerated in the same pass as the installer build being reviewed
- Record the installer path, baseline JSON path, size-analysis JSON path, and validation JSON path with the release evidence
