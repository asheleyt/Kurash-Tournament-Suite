# Windows Distribution Roadmap

## Scope

This pass stayed roadmap-first and limited implementation to low-risk local work only. The currently passing packaging/runtime path remains the default assumption, and the new baseline metrics here are local-machine evidence, not clean-machine truth.

## Current Local Baseline

### Baseline metrics

| Metric | Current local value | Notes |
| --- | --- | --- |
| Installer size | `395,714,496` bytes (`377.38 MiB`) | Measured from `electron-app/build-output/KTS-Setup-1.0.0.exe` |
| Installed size | `1,120,581,611` bytes (`1.04 GiB`) | Measured from the isolated temp-installed payload |
| Install time | `38,377 ms` (`38.38 s`) | From the isolated temp install wrapper timing |
| First-launch time | `22,998 ms` (`23.00 s`) | From the installed-payload harness against the temp-installed `resources` directory |
| Relaunch time | `4,913 ms` (`4.91 s`) | From the installed-payload harness against the temp-installed `resources` directory |

### Isolation and cleanup

- The baseline command used an isolated temp install root: `C:\Users\admin\AppData\Local\Temp\KTSBL_20260418233526`
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
| `resources` | `759,412,348` bytes |
| `locales` | `48,600,130` bytes |

Top 10 largest files:

| File | Size |
| --- | --- |
| `resources/app.asar` | `348,001,950` bytes |
| `Kurash Scoreboard.exe` | `222,836,736` bytes |
| `resources/portable/runtime/php/icudt71.dll` | `30,422,016` bytes |
| `resources/portable/runtime/php/windowsXamppPhp/icudt71.dll` | `30,422,016` bytes |
| `dxcompiler.dll` | `25,664,512` bytes |
| `LICENSES.chromium.html` | `19,472,684` bytes |
| `resources/portable/runtime/mariadb/bin/mysqld.exe` | `16,664,488` bytes |
| `resources/portable/runtime/mariadb/bin/mariabackup.exe` | `15,732,648` bytes |
| `resources/laravel/vendor/laravel/pint/builds/pint` | `15,605,171` bytes |
| `icudtl.dat` | `10,822,192` bytes |

Grouped totals:

| Group | Size |
| --- | --- |
| App code | `409,679,151` bytes (`390.70 MiB`) |
| PHP runtime | `188,766,079` bytes (`180.0 MiB`) |
| MariaDB runtime | `153,850,990` bytes (`146.7 MiB`) |
| Bundled assets | `368,285,391` bytes (`351.22 MiB`) |

## Recommendations By Track

### 1. Trust and signing readiness

- Define signing ownership, certificate source of truth, and release execution path before any signing-flow implementation. Classification: `needs release/process owner`
- Decide whether the project needs OV first, EV first, or a staged OV-to-EV approach for early releases. Classification: `needs product decision`
- Prepare a signing plan that covers timestamping, which binaries must be signed, and how signing evidence is captured in release artifacts. Classification: `blocked on external/signing prerequisites`

### 2. Installer UX and first-run confidence

- Keep the isolated temp-install baseline healthy now that the installed payload materializes and the local launch metrics come from the installed-payload harness. Classification: `implement now`
- Decide whether one-click install is still the desired product experience once the temp-install behavior is understood. Classification: `needs product decision`
- After temp-install behavior is stable, add a lightweight post-install confidence check or clearer installer messaging for first launch. Classification: `implement now`

### 3. Size discipline

- Break down `resources/app.asar` further, because it dominates the packaged size and is the clearest current optimization target. Classification: `implement now`
- Audit the duplicated PHP ICU payload under `resources/portable/runtime/php/` and `resources/portable/runtime/php/windowsXamppPhp/` to confirm whether both copies are required. Classification: `implement now`
- Review packaged vendor and tooling payload, starting with `resources/laravel/vendor/laravel/pint/builds/pint`, for safe release-only exclusions. Classification: `implement now`
- Decide whether locale pruning or Chromium asset trimming is acceptable for the supported audience. Classification: `needs product decision`

### 4. Release safety, ownership, and evidence

- Establish a release/process owner for clean-machine packaging validation, signing, and final ship/no-ship approval. Classification: `needs release/process owner`
- Keep `distribution-baseline.local.json` as a local evidence artifact and define where release evidence lives outside developer machines. Classification: `needs release/process owner`
- Add a clean-machine validation checklist that covers install, first launch, relaunch, uninstall, and residual file checks. Classification: `implement now`

### 5. Startup and relaunch performance

- Use the current local timings as the starting baseline only: first launch `12.24 s`, relaunch `4.03 s`. Classification: `implement now`
- Investigate whether the very large `app.asar` and duplicated runtime payload are materially affecting first-launch cost. Classification: `implement now`
- Re-measure on a clean non-dev Windows machine after the installer-path issue is understood. Classification: `needs release/process owner`

## Classification Table

| Recommendation | Classification |
| --- | --- |
| Define signing ownership, certificate source of truth, and release execution path | `needs release/process owner` |
| Choose OV, EV, or staged signing approach | `needs product decision` |
| Prepare timestamped signing plan and binary coverage list | `blocked on external/signing prerequisites` |
| Keep isolated temp-install baseline and installed-payload harness healthy | `implement now` |
| Decide whether one-click NSIS remains the desired installer mode | `needs product decision` |
| Add post-install confidence check or clearer first-run installer messaging | `implement now` |
| Decompose `resources/app.asar` for trim candidates | `implement now` |
| Audit duplicate PHP ICU/runtime payload | `implement now` |
| Review packaged vendor/tooling payload such as Laravel Pint | `implement now` |
| Decide on locale or Chromium asset trimming policy | `needs product decision` |
| Assign clean-machine validation and release signoff owner | `needs release/process owner` |
| Define long-term storage for release evidence artifacts | `needs release/process owner` |
| Add clean-machine validation checklist | `implement now` |
| Re-measure startup and install behavior on non-dev machines | `needs release/process owner` |

## Safe Local Changes Already Completed In This Pass

- Added `npm run measure:electron:baseline` at the repo root and `npm run measure:baseline` inside `electron-app`
- Added `electron-app/scripts/measure-distribution-baseline.ps1` to produce `electron-app/build-output/distribution-baseline.local.json`
- Added additive launch timing fields to packaged validation without changing existing readiness or pass/fail semantics
- Kept baseline measurement isolated from the default user data path and verified cleanup explicitly
- Switched local baseline launch metrics to the installed-payload harness path instead of the `win-unpacked` fallback
- Updated the Windows packaging icon to use `electron-app/build-resources/KTS_Icon.ico`
- Updated the Windows-facing shortcut label to `KTS Controller`
- Added `npm run verify:electron:release-discipline` and `npm --prefix electron-app run verify:release-discipline`
- Added `electron-app/WINDOWS_RELEASE_CHECKLIST.md`

## Risks, Blockers, And Ownership Gaps

- Signing work is intentionally blocked until ownership, certificate source of truth, and release execution path are defined
- The largest size driver is `resources/app.asar`, and no safe trim plan should be approved until that payload is decomposed into concrete contributors
- Current launch metrics are still local-dev-machine evidence and should be rechecked on a clean non-dev Windows machine before release signoff

## Verification Plan For Clean-Machine Truth

1. Run the NSIS installer on a clean Windows machine without the local dev environment.
2. Measure installer size, installed size, install time, first-launch time, and relaunch time again from that machine.
3. Confirm install, first launch, relaunch, uninstall, and residual file cleanup.
4. Repeat once signing ownership and signing prerequisites are defined.
