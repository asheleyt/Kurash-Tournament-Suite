# Windows Distribution Roadmap

## Scope

This pass kept packaging/runtime stabilization as the default assumption and limited implementation to low-risk Windows distribution work:

- explicit desktop shortcut choice in the assisted NSIS installer
- regenerated local temp-install baseline metrics
- conservative size-discipline passes with a dedicated local size-analysis artifact
- safe PHP runtime reference-material trimming in staged packaging only, including a dedicated `pear`-only pass 6 trim

These numbers are still local-machine evidence, not clean-machine release truth.

## Current Local Baseline

### Baseline metrics

| Metric | Current local value | Notes |
| --- | --- | --- |
| Installer size | `234,871,139` bytes (`223.99 MiB`) | Measured from `electron-app/build-output/KTS-Setup-1.0.0.exe` |
| Installed size | `660,286,076` bytes (`629.70 MiB`) | Measured from the isolated temp-installed payload |
| Install time | `27,859 ms` (`27.86 s`) | From the isolated temp install wrapper timing |
| First-launch time | `21,014 ms` (`21.01 s`) | From the installed-payload harness against the temp-installed `resources` directory |
| Relaunch time | `4,629 ms` (`4.63 s`) | From the installed-payload harness against the temp-installed `resources` directory |

### Isolation and cleanup

- The baseline command used an isolated temp install root: `C:\Users\admin\AppData\Local\Temp\KTSBL_20260419172620`
- Cleanup verification passed for:
  - temp install directory removal
  - temp harness run-root removal
  - temp validation results removal
  - temp measurement root removal
- Default user data stayed untouched:
  - path: `C:\Users\admin\AppData\Roaming\Kurash Scoreboard`
  - `defaultUserDataUntouched: true`

### Icon selection

- Active packaging ICO path: `electron-app/build-resources/KTS_Icon.ico`
- ICO validation: valid Windows ICO, multi-size, `9` embedded images
- Embedded sizes: `16x16`, `20x20`, `24x24`, `32x32`, `40x40`, `48x48`, `64x64`, `128x128`, `256x256`

### Practical size breakdown

Top-level folder sizes from the current local payload source:

| Path | Size |
| --- | --- |
| `resources` | `299,085,506` bytes |
| `locales` | `48,600,130` bytes |

Top 10 largest files:

| File | Size |
| --- | --- |
| `Kurash Scoreboard.exe` | `222,836,736` bytes |
| `resources/portable/runtime/php/icudt71.dll` | `30,422,016` bytes |
| `dxcompiler.dll` | `25,664,512` bytes |
| `LICENSES.chromium.html` | `19,472,684` bytes |
| `resources/portable/runtime/mariadb/bin/mysqld.exe` | `16,664,488` bytes |
| `resources/portable/runtime/mariadb/bin/mariabackup.exe` | `15,732,648` bytes |
| `icudtl.dat` | `10,822,192` bytes |
| `resources/portable/runtime/php/ext/php_gd.dll` | `9,654,784` bytes |
| `resources/portable/runtime/php/php8ts.dll` | `9,074,176` bytes |
| `libGLESv2.dll` | `7,954,432` bytes |

Grouped totals:

| Group | Size |
| --- | --- |
| App code | `50,895,068` bytes (`48.54 MiB`) |
| PHP runtime | `87,223,346` bytes (`83.18 MiB`) |
| MariaDB runtime | `153,850,990` bytes (`146.72 MiB`) |
| Bundled assets | `368,316,672` bytes (`351.25 MiB`) |

### Size-analysis snapshot

The dedicated local size-analysis artifact is `electron-app/build-output/distribution-size-analysis.local.json`.

- `resources/app.asar` is now `4,007,687` bytes (`3.82 MiB`) in the current packaged build
- The duplicated nested `windowsXamppPhp` payload is now excluded from the packaged runtime:
  - current nested payload size: `0` bytes
  - current exact duplicate bytes: `0`
- `laravel/pint` is now excluded from the packaged vendor payload and no longer appears in the packaged size-analysis results
- Additional staged PHP reference/tooling directories are now excluded from the packaged runtime:
  - `CompatInfo`
  - `data`
  - `dev`
  - `docs`
  - `extras`
  - `pear`
  - `scripts`
  - `tests`
- The largest packaged vendor/tooling payloads currently include:
  - `fakerphp/faker`: `10,092,814` bytes
  - `laravel/framework`: `7,775,655` bytes
  - `phpunit/phpunit`: `2,753,081` bytes
- `fakerphp/faker` was tested as a raw path exclusion and broke packaged bootstrap during `artisan optimize:clear`, so it must stay packaged unless Composer autoload/package metadata is also rewritten
- `laravel/sail` remains packaged for now because it is tiny (`80,017` bytes) and still advertises a Laravel service provider in Composer metadata
- `pear` is now excluded from the staged packaged PHP runtime as a dedicated one-target-only trim and no longer appears as a packaged top-level PHP directory in the current build
- The highest-value remaining non-runtime PHP payload candidates after the `pear` trim are:
  - `php8embed.lib`: `934,126` bytes
  - `lib`: `475,648` bytes

## Recommendations By Track

### 1. Trust and signing readiness

- Define signing ownership, certificate source of truth, and release execution path before any signing-flow implementation. Classification: `needs release/process owner`
- Decide whether the project needs OV first, EV first, or a staged OV-to-EV approach for early releases. Classification: `needs product decision`
- Prepare a signing plan that covers timestamping, which binaries must be signed, and how signing evidence is captured in release artifacts. Classification: `blocked on external/signing prerequisites`

### 2. Installer UX and first-run confidence

- Keep the isolated temp-install baseline and installed-payload harness healthy, because they are now the local source of truth for installer-path timing. Classification: `implement now`
- Keep the explicit desktop shortcut choice page validated as release behavior and preserve shortcut cleanup on uninstall. Classification: `implement now`
- Add clearer finish-page messaging or a lightweight first-run reassurance step only if tester feedback still shows confusion after the current assisted flow. Classification: `implement now`

### 3. Size discipline

- Keep `runtime-stage/**` excluded from `build.files`, because that local fix collapsed `app.asar` from the old bloated state to the current `3.82 MiB`. Classification: `implement now`
- Keep `windowsXamppPhp` excluded from PHP runtime staging, because that duplicate nested payload has now been removed from the packaged runtime and from the local size-analysis artifact. Classification: `implement now`
- Keep `CompatInfo`, `data`, `dev`, `docs`, `extras`, `pear`, `scripts`, and `tests` excluded from PHP runtime staging, because that trim now passes the full packaged runtime/bootstrap path and removes non-runtime/reference material from the shipped bundle. Classification: `implement now`
- Keep `laravel/pint` excluded from the packaged vendor payload, because that trim is now verified against the full packaged bootstrap path. Classification: `implement now`
- Treat `fakerphp/faker` and `laravel/sail` as metadata-sensitive packages in the current filter-only approach; do not raw-path exclude them again without a staged Composer metadata rewrite. Classification: `implement now`
- Review remaining packaged vendor/tooling payload such as `phpunit/phpunit` and Composer autoload metadata for the next safe prune path. Classification: `implement now`
- Review remaining PHP payload candidates such as `php8embed.lib` and `lib` for safe release-only exclusions. Classification: `implement now`
- Decide whether locale pruning or Chromium asset trimming is acceptable for the supported audience. Classification: `needs product decision`

### 4. Release safety, ownership, and evidence

- Establish a release/process owner for clean-machine packaging validation, signing, and final ship/no-ship approval. Classification: `needs release/process owner`
- Keep `distribution-baseline.local.json` and `distribution-size-analysis.local.json` as local evidence artifacts and define where durable release evidence lives outside developer machines. Classification: `needs release/process owner`
- Keep the release checklist aligned with real installer behavior so shortcut automation and shortcut choice are not described interchangeably. Classification: `implement now`
- Treat the `pear`-only trim as closed release evidence after the completed local and clean-machine install, uninstall, reinstall, and shortcut-cleanup checks. Classification: `implemented`

### 5. Startup and relaunch performance

- Use the current local timings as the starting baseline only: first launch `21.01 s`, relaunch `4.63 s`. Classification: `implement now`
- Re-measure after any future vendor/tooling or PHP-directory trims to see whether those reductions materially improve first-launch cost. Classification: `implement now`
- Re-measure on a clean non-dev Windows machine after the next size-discipline changes land. Classification: `needs release/process owner`
- Fix startup UX so repeated launch attempts do not produce overlapping service boot races or false startup failures. Classification: `implement now`

## Classification Table

| Recommendation | Classification |
| --- | --- |
| Define signing ownership, certificate source of truth, and release execution path | `needs release/process owner` |
| Choose OV, EV, or staged signing approach | `needs product decision` |
| Prepare timestamped signing plan and binary coverage list | `blocked on external/signing prerequisites` |
| Keep isolated temp-install baseline and installed-payload harness healthy | `implement now` |
| Keep the explicit desktop shortcut choice page validated and preserve shortcut cleanup on uninstall | `implement now` |
| Add post-install confidence or first-run reassurance messaging if needed | `implement now` |
| Keep `runtime-stage/**` excluded from packaged app files | `implement now` |
| Keep `windowsXamppPhp` excluded from packaged PHP runtime staging | `implement now` |
| Keep `CompatInfo`, `data`, `dev`, `docs`, `extras`, `pear`, `scripts`, and `tests` excluded from packaged PHP runtime staging | `implement now` |
| Keep `laravel/pint` excluded from packaged vendor payload | `implement now` |
| Treat `fakerphp/faker` and `laravel/sail` as metadata-sensitive in the current filter-only approach | `implement now` |
| Review remaining vendor/tooling payload such as `phpunit/phpunit` and Composer autoload metadata | `implement now` |
| Review remaining PHP payload candidates such as `php8embed.lib` and `lib` | `implement now` |
| Decide on locale or Chromium asset trimming policy | `needs product decision` |
| Assign clean-machine validation and release signoff owner | `needs release/process owner` |
| Define durable storage for release evidence artifacts | `needs release/process owner` |
| Keep the release checklist aligned with real installer behavior | `implement now` |
| Treat the `pear` trim as closed release evidence after completed local and clean-machine install/uninstall/reinstall validation | `implemented` |
| Re-measure startup and install behavior on non-dev machines after future trims | `needs release/process owner` |
| Fix repeated-launch startup races so users cannot trigger false startup failures by clicking the shortcut multiple times | `implement now` |

## Safe Local Changes Already Completed In This Pass

- Added `npm run measure:electron:baseline` at the repo root and `npm run measure:baseline` inside `electron-app`
- Added `electron-app/scripts/measure-distribution-baseline.ps1` to produce `electron-app/build-output/distribution-baseline.local.json`
- Switched local baseline launch metrics to the installed-payload harness path instead of the `win-unpacked` fallback
- Updated the Windows packaging icon to use `electron-app/build-resources/KTS_Icon.ico`
- Updated the Windows-facing shortcut label to `KTS Controller`
- Added `npm run verify:electron:release-discipline` and `npm --prefix electron-app run verify:release-discipline`
- Added `electron-app/WINDOWS_RELEASE_CHECKLIST.md`
- Added an explicit installer desktop shortcut choice page backed by registry persistence and uninstall cleanup
- Added `npm run analyze:electron:size` at the repo root, `npm run analyze:size` inside `electron-app`, and `electron-app/scripts/analyze-distribution-size.mjs`
- Excluded `runtime-stage/**` from packaged app files, which reduced the current local `app.asar` footprint to `4,007,687` bytes in the size-analysis artifact
- Excluded the duplicate `windowsXamppPhp` payload from PHP runtime staging, which reduced the current local PHP runtime total to `104,246,676` bytes and removed the prior exact duplicate block from the size-analysis artifact
- Excluded `laravel/pint` from the packaged vendor payload and revalidated the packaged runtime/bootstrap path end to end
- Excluded `CompatInfo`, `data`, `dev`, `docs`, `scripts`, and `tests` from PHP runtime staging, which reduced the current local PHP runtime total to `101,803,246` bytes and kept packaged bootstrap healthy
- Excluded `extras` from PHP runtime staging after confirming the shipped portable `php.ini` path does not actively reference `browscap`, `openssl.cafile`, or `openssl.capath`, which reduced the current local PHP runtime total to `97,470,221` bytes and kept packaged runtime/bootstrap healthy
- Excluded `pear` from PHP runtime staging as a dedicated pass-6 one-target-only trim, which reduced the current local PHP runtime total to `87,223,346` bytes and kept the NSIS build, packaged runtime verification, packaged bootstrap verification, size analysis, baseline measurement, and release-discipline verification green
- Explicitly rejected raw-path exclusion of `fakerphp/faker` after it broke packaged bootstrap during `artisan optimize:clear`
- Regenerated the local baseline JSON after the current packaging changes and confirmed `installedPayloadSource: temp-install`

## Risks, Blockers, And Ownership Gaps

- Signing work is intentionally blocked until ownership, certificate source of truth, and release execution path are defined
- The largest remaining size opportunities are `fakerphp/faker`, `phpunit/phpunit`, and a few remaining non-runtime PHP artifacts like `php8embed.lib` and `lib`, not `app.asar`, `laravel/pint`, or the removed duplicate/reference PHP payloads
- Some vendor trims are no longer pure path-exclusion work; `fakerphp/faker` and `laravel/sail` now look like Composer metadata problems rather than simple file-copy problems
- The explicit desktop shortcut choice and uninstall cleanup are now validated on both local and clean-machine testing
- The `pear`-only trim is now validated by the automated chain plus local and clean-machine install/uninstall/reinstall checks
- Startup still feels slow enough that impatient users may click the shortcut repeatedly
- Repeated launch attempts can trigger a multi-launch concurrency bug that surfaces a false MariaDB readiness failure before another instance finishes opening normally
- Current launch metrics are still local-dev-machine evidence and should be rechecked on a clean non-dev Windows machine before release signoff

## Verification Plan For Clean-Machine Truth

1. Run the assisted NSIS installer on a clean Windows machine without the local dev environment.
2. Confirm the install-mode page, install-location page, explicit desktop shortcut choice page, and finish-page launch checkbox all behave as expected.
3. Measure installer size, installed size, install time, first-launch time, and relaunch time again from that machine.
4. Confirm install, first launch, relaunch, recovery launch, uninstall, shortcut cleanup, and residual-file expectations.
5. Repeat once future size-discipline changes or signing prerequisites are introduced.
