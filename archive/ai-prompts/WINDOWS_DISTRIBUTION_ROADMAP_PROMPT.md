# Windows Distribution Roadmap Task

## Mission
Treat packaging/runtime stabilization as functionally complete unless new evidence proves regression. This task is about Windows distribution quality, not a broad repackaging rewrite.

Focus the roadmap across these tracks:

1. Trust and signing readiness
2. Installer UX and first-run confidence
3. Size discipline
4. Release safety, ownership, and evidence
5. Startup and relaunch performance

## Hard Guardrails

1. Do not treat this as a broad implementation pass across all five tracks.
2. The first deliverable must be roadmap-first.
3. Any implementation in this pass must be limited to low-risk, clearly local improvements only.
4. Preserve the currently passing packaging/runtime baseline as the default assumption unless new evidence proves regression.
5. Do not make signing-flow code changes unless signing ownership, certificate source of truth, and release execution path are clearly defined.
6. Treat installer size, installed size, install time, first-launch time, and relaunch time gathered in this pass as local baseline metrics, not clean-machine truth.
7. Keep baseline measurement isolated:
   - use an isolated temp install path
   - verify cleanup explicitly
   - do not pollute the default userData or runtime state used by normal validation
8. Timing fields added in this pass must remain additive only and must not change existing readiness or pass/fail semantics.
9. Keep the local baseline artifact name exact: `electron-app/build-output/distribution-baseline.local.json`.

## Required Inputs

- Use `electron-app/build-output/distribution-baseline.local.json` if it exists.
- Use `electron-app/build-output/distribution-size-analysis.local.json` if it exists.
- Use `electron-app/build-output/portable-validation-results.json` as the local packaged launch baseline.
- Use the currently selected Windows packaging icon metadata when discussing brand/readiness. Report the exact selected ICO file and confirm whether it is a multi-size Windows ICO.

## Baseline Requirements

Before proposing optimization work, quantify the current local baseline for:

- installer size
- installed size
- install time
- first-launch time
- relaunch time

If a metric is unavailable or is only available via fallback, say so plainly and explain why.

The packaged size breakdown must be reported as:

- top-level folder sizes
- top 10 largest files
- grouped totals for app code, PHP runtime, MariaDB runtime, and bundled assets

If `distribution-size-analysis.local.json` exists, also report:

- current `app.asar` composition
- exact duplicate PHP bytes under `php/windowsXamppPhp`
- largest packaged vendor/tooling candidates

## Recommendation Classification

Every recommendation must be labeled as exactly one of:

- `implement now`
- `needs product decision`
- `needs release/process owner`
- `blocked on external/signing prerequisites`

## Expected Output

Produce a roadmap document with these sections:

1. Current local baseline and caveats
2. Recommended next steps by track
3. Classification table for every recommendation
4. Safe local changes already completed in this pass
5. Risks, blockers, and ownership gaps
6. Verification plan for clean-machine truth

If low-risk implementation work already landed in the same pass, distinguish clearly between:

- completed local changes
- remaining roadmap recommendations

Do not broaden implementation beyond low-risk local changes in this pass.
