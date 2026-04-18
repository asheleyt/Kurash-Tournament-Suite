# Windows Release Checklist

## Scope

This checklist is for the current Windows packaging pass only:

- NSIS installer output
- packaged runtime/bootstrap confidence
- desktop shortcut readability and icon confirmation
- uninstall and cleanup review

This checklist does not cover signing, payload trimming, or public/web branding.

## Automated local evidence

Run these from a normal local shell before a Windows packaging handoff:

1. `npm run build:electron:nsis`
2. `npm run measure:electron:baseline`
3. `npm run verify:electron:release-discipline`

Expected local evidence artifacts:

- `electron-app/build-output/KTS-Setup-<version>.exe`
- `electron-app/build-output/portable-validation-results.json`
- `electron-app/build-output/distribution-baseline.local.json`

Expected baseline conditions:

- `installedPayloadSource: temp-install`
- `launchMetricsSource: installed-payload-harness`
- `validation.installedPayloadHarness.validationPassed: true`
- `userDataIsolation.defaultUserDataUntouched: true`

## Manual installer UX checks

- Install from `electron-app/build-output/KTS-Setup-<version>.exe`
- Confirm the installer now uses the assisted wizard flow rather than one-click
- Confirm per-user install remains the default selection on the install-mode page
- Confirm install-location choice is available and the default path looks sensible
- Confirm the desktop shortcut choice appears and is checked by default
- Confirm the finish page shows launch-after-install and it is checked by default
- Confirm no Windows boot auto-start option appears anywhere in the installer
- Confirm the desktop shortcut label is `KTS Controller`
- Confirm the shortcut icon and installed app icon use the KTS controller ICO
- Confirm first launch reaches the ready state without extra setup steps
- Confirm relaunch reaches ready state cleanly
- Confirm recovery launch still reaches ready state after a forced-close style interruption

## Manual uninstall checks

- Run uninstall from Windows Apps/Installed Apps or the generated uninstaller
- Confirm installed app files are removed from the install directory
- Confirm shortcut cleanup is correct
- Confirm `%APPDATA%\Kurash Scoreboard` is preserved unless a separate migration plan says otherwise

## Release discipline checks

- Confirm no stale legacy installer artifact remains in `electron-app/build-output`
- Confirm the active packaging icon source remains `electron-app/build-resources/KTS_Icon.ico`
- Confirm the local baseline JSON was regenerated in the same pass as the installer build being reviewed
- Record the installer path, baseline JSON path, and validation JSON path with the release evidence
