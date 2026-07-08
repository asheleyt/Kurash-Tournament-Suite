# Phase 5: QA & Validation Report

**Generated:** 2026-07-08
**Auditor:** opencode (automated)
**Scope:** UI Trustworthiness initiative — indicator sourcing, toast system, accessibility

---

## 5.1: Indicator Authoritative Source Verification

| Indicator | Authoritative Source | Sync Risk | Notes |
|-----------|---------------------|-----------|-------|
| Break | `gameState.isBreakMode` (`refereeController.setup.ts:546`) | Low | Broadcast via `broadcastBreakState()` (line 2456). Scoreboard receives via `applyBreakPayload()` (line 1514) AND `applyTimerPayload()` via `activeTimer === 'break'` (line 1478). Dual-path but both carry the same source value. |
| Green Medic | `gameState.isMedicMode` + `gameState.timerPlayer` (`refereeController.setup.ts:545,551`) | Low | Broadcast via `broadcastMedicState()` (line 2466). Scoreboard receives via `applyMedicPayload()` (line 1518) AND `applyTimerPayload()` via `activeTimer === 'medic'` (line 1477). Dual-path. |
| Blue Medic | Same as Green Medic with `timerPlayer === 'player2'` | Low | Same dual-path pattern. The `timerPlayer` field disambiguates Green vs Blue. |
| Jazo | `gameState.isJazo` (`refereeController.setup.ts:550`) | Low | Broadcast via `broadcastJazoState()` (line 2479). Scoreboard receives via `applyJazoPayload()` (line 1528) AND `applyTimerPayload()` via `activeTimer === 'jazo'` (line 1479). Dual-path. |
| Connection Status | `connectionState` computed (`useRefereeControllerSyncPanels.ts:285`) | Very Low | Pure computed from reactive inputs (`isOnline`, `hasKnownDeviceCredentials`, `assignmentState`, busy flags). Single authoritative source, no dual-path. |
| Display Status (Snapshot Mode) | `snapshotMode` computed (`useRefereeControllerSyncPanels.ts:235`) | Very Low | Pure computed from `queueSourceMode`, `queueIsDegraded`, recovery busy flags. Single authoritative source. |

### Findings

1. **Dual-path broadcast for Break/Medic/Jazo (Low Risk):** Each mode indicator is broadcast both via its dedicated channel (`broadcastBreakState`, `broadcastMedicState`, `broadcastJazoState`) AND embedded in the timer payload (`buildTimerPayload()` at line 2338, which sets `activeTimer` to `'break'`/`'medic'`/`'jazo'`). The scoreboard receives both paths via `applyBroadcastSnapshot()` (line 1711-1721). If messages arrive out of order, a brief inconsistency could occur (e.g., timer says `activeTimer: 'break'` but the separate break payload hasn't arrived yet). However, the `applyTimerPayload` handler (lines 1473-1482) immediately sets mode flags from `activeTimer`, providing a consistent fast-path.

2. **No stale state detected:** All broadcast functions read directly from `gameState` reactive properties at call time. The `publishLocalScoreboardState()` function (line 2389) stamps each update with `new Date().toISOString()`, and the scoreboard's `isSnapshotNewer()` guard (line 1723) prevents stale data from overwriting newer state.

3. **Race condition in `handleBreakTime()` (line 1542):** When starting a break, `broadcastBreakState()` is called at line 1560 before the break timer is configured. The break state (`isBreak: true`) is sent immediately so the scoreboard can show the overlay. The timer state follows. This is intentional and documented (comment at line 1558-1559). Low risk — the scoreboard handles partial updates gracefully via `applyBroadcastSnapshot()`.

4. **Race condition in auto-Jazo (line 1446-1472):** When Jazo activates at halftime, `gameState.isJazo = true` is set, then `broadcastJazoState()` and `broadcastTimerState()` are called sequentially. Both carry Jazo state. No risk of desync.

5. **Connection/Display indicators are purely reactive:** `connectionState` and `snapshotMode` are `computed` values derived from other reactive state. They cannot be stale — Vue reactivity ensures they update synchronously when inputs change.

---

## 5.2: Toast System Verification

### Timeout Values

| Tone | Expected | Actual | Status |
|------|----------|--------|--------|
| success | 2500ms | 2500ms (`feedbackRegistry.ts:67`) | PASS |
| info | 3000ms | 3000ms (`feedbackRegistry.ts:68`) | PASS |
| warning | 4000ms | 4000ms (`feedbackRegistry.ts:69`) | PASS |
| error | 5000ms | 5000ms (`feedbackRegistry.ts:70`) | PASS |

All timeout values match the standard defined in `feedbackRegistry.ts:66-71`.

### Deduplication Logic

- **Window:** 5000ms (`useControllerToast.ts:67` — `TOAST_DEDUP_WINDOW_MS = 5000`)
- **Mechanism:** `isDuplicateToast()` (line 75-91) checks `recentToastMessages` Map, registers new entries, and cleans up stale entries when size exceeds 50.
- **Cleanup threshold:** Entries older than `TOAST_DEDUP_WINDOW_MS * 2` (10 seconds) are purged when map size > 50 (lines 83-89).
- **Scope:** Deduplication only applies to `showBanner()` (line 108). `showResultToast()` (line 124) does NOT deduplicate — it always displays.

### Edge Cases

| Edge Case | Behavior | Risk |
|-----------|----------|------|
| Rapid fire (same message < 5s) | Suppressed by deduplication | Safe |
| Rapid fire (different messages) | Each shown independently; previous banner replaced | Safe |
| Map growth between cleanups | Bounded by cleanup at size > 50; entries older than 10s pruned | Safe |
| Composable lifecycle | Map is module-scoped per composable instance; garbage collected when instance is destroyed | Safe |
| Custom timeout overrides | `showBanner()` accepts optional `timeout` param (line 106); callers like `showBanner(msg, 'error', 5000)` work correctly | Safe |
| Timer cleanup on dismiss | `dismissControllerToast()` (line 154) clears both banner state and `bannerTimer` | Safe |
| Result popup timer leak | `hideResultToast()` (line 141) clears `resultPopupTimer` | Safe |

### E2E Test Coverage

**File:** `tests/e2e/specs/workflow/toasts/01-toast-system.spec.ts`

| Test | What it verifies | Adequacy |
|------|-----------------|----------|
| "app launches without toast errors" | App launches and is responsive | Minimal — no toast-specific verification |
| "keyboard shortcuts work without crashing" | Keys B/J/L/A don't crash the app | Minimal — no toast display verification |

**Assessment: INADEQUATE.** The E2E tests verify only that the app doesn't crash. They do NOT verify:
- Toast display/show behavior
- Timeout/auto-dismiss timing
- Deduplication logic
- Toast slot behavior (status vs result)
- Close button functionality
- Tone-specific styling

**Recommendation:** Add tests that:
1. Trigger a toast and verify DOM presence via `page.locator('[role="status"]')`
2. Wait for auto-dismiss and verify removal
3. Trigger duplicate messages rapidly and verify only one is shown
4. Verify close button dismisses result toasts

---

## 5.3: Accessibility Audit

### Toast Accessibility

| Check | Status | Notes |
|-------|--------|-------|
| `role="status"` | PASS | Present on each toast container (`refereeController.template.html:4271`) |
| `aria-live="polite"` | PASS | Present on each toast container (`refereeController.template.html:4272`) |
| Keyboard dismiss (Enter) | PASS | Close button is a `<button>` element (`template.html:4297`); Enter key works via default button behavior |
| Keyboard dismiss (Escape) | FAIL | No `@keydown.escape` handler on toasts. Users cannot dismiss via Escape key. |
| Toast icons decorative | FAIL | Icons (`CheckCircle2`, `XCircle`, `AlertTriangle`, `RefreshCw`) at lines 4278-4293 lack `aria-hidden="true"`. They are decorative (message text conveys meaning) but screen readers may announce them. |
| Color contrast | PASS | All tones use light text (`*-50`) on dark backgrounds (`*-950/85` or `slate-900/90`). Estimated contrast ratio > 10:1, well above WCAG AA 4.5:1. |
| Keyboard traps | PASS | No focus trapping. Toast container uses `pointer-events-none` (line 4265) with `pointer-events-auto` on children (line 4274). Close button is standard `<button>`. |

### Indicator Accessibility

| Check | Status | Notes |
|-------|--------|-------|
| `aria-label` on indicators | FAIL | Connection status badge (`template.html:163-175`) uses text content but no `aria-label`. The colored dot (`<span class="h-2 w-2 rounded-full">`, line 169-174) has no accessible name — screen readers will skip it or announce it as "span". |
| Screen reader announcements | FAIL | No `aria-live` region wraps the connection/snapshot status badges. State changes (e.g., "Connected" → "Reconnecting") are not announced to screen readers. The `role="status"` + `aria-live="polite"` on toasts (line 4271-4272) only covers toast notifications, not persistent indicators. |
| Keyboard navigation for indicator controls | PASS (partial) | The indicator badges are display-only `<span>` elements — no interaction needed. The recovery action button (`template.html:246-256`) is keyboard accessible (`<button>` element with `@click`). |
| Break/Medic/Jazo overlay accessibility | FAIL | Overlay divs (lines 32, 91, 149) lack `role="alert"` or `aria-live` attributes. Screen readers are not notified when these overlays appear/disappear. |
| Break/Medic/Jazo overlay keyboard dismiss | FAIL | Overlays have no keyboard dismiss mechanism (no Escape handler, no focus trap). However, these are broadcast-driven displays on the scoreboard page (not the controller), so operator interaction is not expected. |

### Specific Findings

1. **Missing `aria-hidden` on toast icons** (`template.html:4278-4293`): The lucide-vue-next SVG icons are purely decorative since the message text and tone styling convey meaning. Add `aria-hidden="true"` to each icon component.

2. **Missing Escape key handler on toasts** (`template.html:4297-4303`): The close button works with Enter/click but not Escape. WCAG 2.1 SC 2.1.1 (Keyboard) doesn't strictly require Escape for dismissible elements, but it's a common user expectation. Consider adding `@keydown.escape="dismissControllerToast(toast.id)"` to the toast container.

3. **Connection indicator not announced** (`template.html:163-175`): The connection status badge changes text (e.g., "Connected" → "Reconnecting" → "Offline") but has no `aria-live` region. A screen reader user would not be notified of connection state changes. Consider wrapping in `<div role="status" aria-live="polite">`.

4. **Colored dot has no accessible name** (`template.html:169-174`): The `<span class="h-2 w-2 rounded-full" :class="syncPrimaryState.dotClass">` is purely visual. Add `aria-hidden="true"` since the adjacent text label conveys the meaning.

5. **Mode overlays lack `role="alert"`** (`kurashScoreBoard.vue:32, 91, 149`): Break/Medic/Jazo overlays appear suddenly and convey important match state. Adding `role="alert"` or `aria-live="assertive"` would help screen reader users, though the scoreboard is primarily a visual display.

---

## Summary

### Passes
- All indicator states trace to single authoritative sources (gameState reactive properties or computed values)
- No stale state risk — broadcast functions read from reactive state at call time; scoreboard has timestamp-based staleness guards
- Toast timeout values match the standard (success=2500, info=3000, warning=4000, error=5000)
- Toast deduplication works correctly with 5-second window and bounded cleanup
- Toast containers have `role="status"` and `aria-live="polite"`
- Color contrast for all toast tones exceeds WCAG AA requirements
- No keyboard traps in toast or indicator UI

### Issues Found
1. **[LOW]** Dual-path broadcast for Break/Medic/Jazo (dedicated + timer payload) creates theoretical out-of-order risk, mitigated by `applyTimerPayload` fast-path
2. **[MEDIUM]** E2E toast tests are inadequate — only verify app doesn't crash, no functional verification
3. **[MEDIUM]** Toast icons missing `aria-hidden="true"` — screen readers may announce decorative SVGs
4. **[MEDIUM]** No Escape key handler for toast dismissal
5. **[MEDIUM]** Connection/snapshot status indicators not wrapped in `aria-live` region — state changes not announced
6. **[LOW]** Colored status dot missing `aria-hidden="true"`
7. **[LOW]** Scoreboard mode overlays (Break/Medic/Jazo) lack `role="alert"` for screen reader announcement

### Risk Assessment
- **Indicator trustworthiness:** HIGH — single authoritative sources, reactive derivation, no stale state paths
- **Toast reliability:** HIGH — correct timeouts, working deduplication, proper timer cleanup
- **Accessibility:** MODERATE — basic ARIA attributes present on toasts, but missing Escape dismiss, icon hiding, and live regions for persistent indicators
