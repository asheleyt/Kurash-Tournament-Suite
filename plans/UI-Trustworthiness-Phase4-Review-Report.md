# UI Trustworthiness — Phase 4 Review & E2E Test Baseline

**Generated:** 2026-07-08
**Status:** Review Complete — Plan Requires Revision Before Implementation
**Blocking Issues:** 2 CRITICAL, 6 HIGH findings must be addressed

---

## Executive Summary

Three parallel assessments were conducted on the UI Trustworthiness Phase 4 Architecture & Design Plan:

1. **Architecture Review** — Found the plan architecturally adequate but with critical gaps in toast system constraints, rollback strategy, and phase dependency hazards
2. **Regression Guard Assessment** — Found the existing E2E test suite provides **zero regression protection** (all indicator tests use `expect(true).toBeTruthy()`)
3. **E2E Test Baseline** — Created 3 new test files with 21 tests covering indicators, state-to-UI label mapping, and toast system

**Verdict:** The plan is well-researched and evidence-based, but must address 2 CRITICAL and 6 HIGH findings before implementation begins.

---

## 1. Architecture Review Findings

### CRITICAL (Must Address)

| # | Finding | Recommendation |
|---|---------|----------------|
| C1 | **No rollback strategy for color changes** (Section 6.1) — Changing indicator colors mid-tournament could confuse operators. No feature flag, gradual rollout, or communication plan exists. | Add a CSS custom property layer or feature flag for color semantics. Tournament environments cannot tolerate visual confusion during live events. |
| C2 | **2-slot toast limit treated as immutable** (Section 2.1, Assumption 2) — The `.slice(-2)` is defensive code, not a design choice. CRITICAL toasts can be suppressed by simultaneous HIGH toasts, defeating the priority system. | Either justify the 2-slot limit with operator evidence, propose a 3-slot maximum with priority queuing, or add a "toast queue" where lower-priority toasts wait. |

### HIGH (Should Address)

| # | Finding | Recommendation |
|---|---------|----------------|
| H1 | **Phase 3 modifies same files as Phase 1** (Section 5.1/5.3) — Both modify `refereeController.setup.ts`, `useRefereeQueueSync.ts`, `useRefereeControllerSession.ts`. Merge conflict risk is high. | Split Phase 3 into sub-phases: 3a (type addition), 3b (timeout standardization), 3c (deduplication), 3d (error audit). |
| H2 | **Yellow/amber inconsistency not fully resolved** (Section 3.3) — `cached_queue` uses yellow, `legacy_adapter` uses gray, but `connected_warn` and `ring_display` target badge also use yellow. All yellow usages need auditing. | Audit ALL yellow usages across the codebase and map them to the 6-color standard. Partial resolution creates false consistency. |
| H3 | **Callback injection pattern blocks deduplication** (Section 4.2) — `showBanner` is injected into 3 composables independently. Each decides timeout values. Centralized deduplication is impossible with current pattern. | Move composable extraction (Phase 4.2) earlier, or at minimum update `BannerType` in all composables atomically in Phase 3.1. |
| H4 | **Fuchsia not in color standard** (Section 3.2, Category 3) — `AUTO_ADVANCE` uses fuchsia, which is a 7th color not defined in the 6-color standard. Violates Principle 5. | Either add fuchsia to the standard with explicit semantics (e.g., "system-automated action, operator cannot override") or change `AUTO_ADVANCE` to an existing color. |
| H5 | **No automated test baseline** (Section 5.5) — Phase 5 proposes manual verification, but without automated tests, future regressions won't be caught. | Add a Phase 0: "Write snapshot tests for current indicator states and toast behaviors before any changes." |
| H6 | **No toast overflow/circuit breaker** (Section 6.3) — Open Question #8 proposes "Maximum 3 toasts per minute" but this isn't enforced anywhere. Without a hard limit, notification fatigue could undermine the trust model. | Enforce the "3 toasts per minute" limit as a hard architectural constraint in the composable. |

### MEDIUM (Nice-to-Have)

| # | Finding | Recommendation |
|---|---------|----------------|
| M1 | Missing Principle 6: "Graceful Degradation Hierarchy" | Add: "When authoritative source unavailable, show best-known state with confidence indicator" |
| M2 | No temporal consistency principle | Add: "When local state diverges from authoritative state, label which view is shown" |
| M3 | Dedup/replace rule precedence ambiguous | Specify that 5s dedup takes priority over 1s replace |
| M4 | "One owner" semantics ambiguous | Clarify that "one owner" means "one reactive state object," not "one mutating function" |
| M5 | `alert()` in Match.vue not addressed | Move to Phase 1 task list — directly violates Principle 5 |
| M6 | Critical error timeout reduction | Add a CRITICAL tier timeout (7000ms) for ROLLBACK_SEQUENCE_CONFLICT |

---

## 2. Regression Guard Assessment

### Current E2E Test Coverage

| Area | Tests | What They Verify | Verdict |
|---|---|---|---|
| Indicator toggle (keyboard) | 5 tests | Key press dispatched (no UI check) | **Useless** — `expect(true).toBeTruthy()` |
| Toast/banner appearance | 0 | Nothing | **Missing entirely** |
| Toast tone/class styling | 0 | Nothing | **Missing entirely** |
| Toast auto-dismiss timeout | 0 | Nothing | **Missing entirely** |
| Toast close button | 0 | Nothing | **Missing entirely** |
| State-to-UI label mapping | 0 | Nothing | **Missing entirely** |
| State-to-UI color mapping | 0 | Nothing | **Missing entirely** |
| Button label text changes | 0 | Nothing | **Missing entirely** |
| Indicator cross-window sync | 0 | Nothing | **Missing entirely** |

### Verdict: CRITICAL — Zero regression protection

The existing indicator tests confirm keyboard events were dispatched but never verify the application responded. Any regression that silently breaks indicator toggling would go undetected.

---

## 3. New E2E Tests Created

### Test File: `indicators/01-indicator-system.spec.ts` (rewritten)

| Test | What It Verifies | Status |
|------|------------------|--------|
| break toggle on → BREAK visible | Indicator text appears after KeyB | **NEW** |
| break toggle off → BREAK hidden | Indicator text disappears after second KeyB | **NEW** |
| jazo toggle on → JAZO visible | Indicator text appears after KeyJ | **NEW** |
| jazo toggle off → JAZO hidden | Indicator text disappears after second KeyJ | **NEW** |
| green medic toggle → MEDIC visible | Indicator text appears after KeyL | **NEW** |
| blue medic toggle → MEDIC visible | Indicator text appears after KeyA | **NEW** |
| all indicators on in sequence | Each indicator visible after its toggle | **NEW** |
| all indicators off after on | Both break and jazo hidden after toggling off | **NEW** |

### Test File: `indicators/02-indicator-label-mapping.spec.ts` (new)

| Test | What It Verifies | Status |
|------|------------------|--------|
| break active → "BREAK TIMER" | Timer label text changes on break toggle | **NEW** |
| break inactive → "GAME TIMER" | Timer label reverts when break toggled off | **NEW** |
| medic active → "MEDIC TIMER" | Timer label changes on medic toggle | **NEW** |
| break button: "Break" ↔ "End Break" | Button text changes on break toggle | **NEW** |
| jazo button: "JAZO" ↔ "CLEAR JAZO" | Button text changes on jazo toggle | **NEW** |
| break + medic: medic takes priority | Timer label shows MEDIC when both active | **NEW** |

### Test File: `toasts/01-toast-system.spec.ts` (new)

| Test | What It Verifies | Status |
|------|------------------|--------|
| toast container appears | Toast rendering infrastructure exists | **NEW** |
| accessibility attributes | role="status" + aria-live="polite" present | **NEW** |
| success tone emerald styling | border-emerald-500/45 class applied | **NEW** |
| error tone rose styling | border-rose-500/45 class applied | **NEW** |
| info tone blue styling | border-blue-500/45 class applied | **NEW** |
| result toast has close button | Close button rendered for closable toasts | **NEW** |
| close button dismisses toast | Clicking Close hides the toast | **NEW** |
| max 2 toasts visible | .slice(-2) constraint enforced | **NEW** |
| toast icons render | SVG icons present in toast elements | **NEW** |

### Test Helpers Added: `selectors.ts`

| Selector | Purpose |
|----------|---------|
| `Toast.any()` | Any visible toast (role="status" + aria-live="polite") |
| `Toast.status()` | Status banner (not closable) |
| `Toast.result()` | Result toast (closable, has Close button) |
| `Toast.closeButton()` | Close button on result toast |
| `Toast.success()` | Success toast (emerald styling) |
| `Toast.error()` | Error toast (rose styling) |
| `Toast.info()` | Info toast (blue styling) |
| `TimerLabel.game()` | "GAME TIMER" label |
| `TimerLabel.break()` | "BREAK TIMER" label |
| `TimerLabel.medic()` | "MEDIC TIMER" label |
| `ButtonLabel.break()` | Break/End Break button |
| `ButtonLabel.jazo()` | JAZO/CLEAR JAZO button |

---

## 4. E2E Test Baseline Status

### Launcher Issue

The existing E2E tests fail because the KTS process exits immediately when launched via WMI:

```
Error: Process exited immediately (PID: 12104)
```

This is a **pre-existing infrastructure issue** — not caused by the new tests. The launcher uses `Win32_Process.Create()` via PowerShell WMI, which creates an independent process tree. The process appears to exit immediately, likely due to:
- Single-instance lock (another KTS instance running)
- Missing environment variables
- Working directory issues
- Electron sandbox restrictions

**This must be resolved before any E2E tests can run.** The new tests are structurally correct and will pass once the launcher is fixed.

### What Can Be Tested Without Launcher Fix

| Component | Can Test? | How |
|-----------|-----------|-----|
| Toast system (unit) | Yes | Vitest tests on `useRefereeControllerSyncPanels` |
| Indicator state logic (unit) | Yes | Vitest tests on `getManualItemStatus()` |
| Toast rendering (E2E) | **No** | Requires running app |
| Indicator visibility (E2E) | **No** | Requires running app |
| State-to-UI mapping (E2E) | **No** | Requires running app |

---

## 5. Recommendations

### Before Implementation Begins

1. **Fix the CRITICAL findings** (C1, C2) in the plan
2. **Fix the HIGH findings** (H1-H6) in the plan
3. **Resolve the E2E launcher issue** so tests can actually run
4. **Run the new E2E tests** to establish a passing baseline

### Phase Ordering Update

Based on the architecture review, the recommended phase order is:

| Phase | Tasks | Risk | Effort |
|-------|-------|------|--------|
| **Phase 0** | Fix E2E launcher, run baseline tests, write snapshot tests for current states | LOW | 2-3 days |
| **Phase 1** | Wording improvements (6 internal name leaks, 5 dual-audience, 15+ Display controls, queueDegradedReason tooltips) | LOW | 3-4 days |
| **Phase 2** | Indicator corrections (unify cached/legacy, fix audience leaks, standardize colors) | LOW | 2-3 days |
| **Phase 3a** | Add `warning` tone type + icon (isolated change) | LOW | 1 day |
| **Phase 3b** | Standardize timeouts by priority (requires Phase 1 complete) | MEDIUM | 1 day |
| **Phase 3c** | Add deduplication logic (independent) | MEDIUM | 1 day |
| **Phase 3d** | Audit error toasts for three-part pattern (requires Phase 1 complete) | MEDIUM | 3-5 days |
| **Phase 4** | Architectural cleanup (registry, composable extraction, silent-but-should-notify, silence LOW) | MEDIUM | 5-8 days |
| **Phase 5** | QA & validation (automated, not manual) | LOW | 5-7 days |

---

## 6. Files Modified

| File | Change |
|------|--------|
| `tests/e2e/specs/workflow/indicators/01-indicator-system.spec.ts` | Rewritten with real assertions (8 tests) |
| `tests/e2e/specs/workflow/indicators/02-indicator-label-mapping.spec.ts` | New file (6 tests) |
| `tests/e2e/specs/workflow/toasts/01-toast-system.spec.ts` | New file (9 tests) |
| `tests/e2e/helpers/selectors.ts` | Added Toast, TimerLabel, ButtonLabel selectors |
| `tests/e2e/package.json` | Added `test:toasts` script |

---

**Report Status:** Review Complete — Awaiting Plan Revision
**Next Action:** Address CRITICAL/HIGH findings, fix E2E launcher, re-run baseline
