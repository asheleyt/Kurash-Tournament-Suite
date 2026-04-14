# Kurash Tournament Suite Packaging

The packaged app loads the bundled Laravel app under `resources/laravel/`. The browser does not read `.vue` files directly; it runs the compiled JS and CSS from `public/build/`.

If you change `resources/js/pages/refereeController.vue`, `kurashScoreBoard.vue`, or related files, those changes only appear in the packaged app after the Vite bundle is rebuilt and copied into `win-unpacked`.

## Build outputs

`electron-builder` writes to `electron-app/build-output/`.

Runtime smoke tests still use:

`electron-app/build-output/win-unpacked/Kurash Scoreboard.exe`

Client installer output is:

`electron-app/build-output/KTS-Setup-<version>.exe`

## Packaging commands

From the repo root:

```bash
npm run build:electron:portable
```

Builds the internal portable package used for QA, validation, and demo handoff.

```bash
npm run build:electron:nsis
```

Builds the client-facing NSIS installer for Kurash Tournament Suite (KTS).

This installer uses a zip-based payload instead of the differential-update package path, which makes client installs a bit friendlier at the cost of a somewhat larger setup file.

```bash
npm run package:client
```

Convenience alias for the NSIS installer build.

```bash
npm run package:demo
```

Builds the portable package and creates the fallback demo zip from `win-unpacked`.

Before Electron packaging runs, the stop script shuts down any packaged `Kurash Scoreboard.exe`, portable PHP, or portable MariaDB processes that would otherwise lock `win-unpacked`.

## Fast asset sync

After at least one successful full portable build, you can copy rebuilt Laravel and Vite assets into `win-unpacked` with:

```bash
npm run sync:electron-dist
```

Then restart `Kurash Scoreboard.exe`.

## Dev vs packaged app

| | Repo dev flow | Packaged runtime |
|--|--|--|
| Laravel + Vue source | Repo folder | `win-unpacked/resources/laravel/` |
| JS/CSS the UI runs | Vite dev server or `public/build` | `public/build` only |

If you skip `npm run build` before packaging or syncing, the packaged app will keep showing an old bundle.

## Client install notes

For client self-install, send the NSIS installer:

`electron-app/build-output/KTS-Setup-<version>.exe`

Expected client flow:

1. Run the installer.
2. If Windows SmartScreen appears, click `More info`, then `Run anyway`.
3. Finish the install.
4. Launch `KTS` from the desktop shortcut or Start Menu.

The installer is unsigned in this pass, so SmartScreen guidance is expected.

Because the packaged runtime is bundled in full, the installer can still take a minute to unpack on some Windows machines. That is expected for this build.

## File lock troubleshooting

If packaging fails because files are in use:

1. Quit `Kurash Scoreboard.exe`.
2. End any packaged `php.exe` or `mysqld.exe` processes tied to `win-unpacked`.
3. Close File Explorer windows that are open inside `win-unpacked`.
4. Pause OneDrive on this repo while building if it is holding files open.
5. Run the build again.

Manual stop command:

```powershell
powershell -ExecutionPolicy Bypass -File .\electron-app\scripts\stop-packaged-app.ps1
```

## Demo zip fallback

For dry-run fallback distribution, the safest portable handoff is still the zipped app folder built from validated `win-unpacked`, not repo `.bat` files.

`npm run package:demo` will:

- rebuild the portable Electron package
- stage a runnable folder named `Kurash Scoreboard`
- add a top-level `README_FIRST.txt`
- create `electron-app/build-output/Kurash-Scoreboard-Demo.zip`

When handing out the demo zip:

- extract the zip fully first
- open the extracted `Kurash Scoreboard` folder
- run `Kurash Scoreboard.exe`
- do not run the app from inside the zip
- do not move only the `.exe` out of the folder
