# UI Trustworthiness Investigation — Phase 4: Architecture & Design Plan

**Generated:** 2026-07-08
**Investigation Scope:** Trust Model, Notification Standard, Indicator Standard, State-to-UI Mapping, Implementation Roadmap
**Status:** Design Proposal — Ready for Stakeholder Review
**Constraints:** No code modifications. Design only. Based on evidence from Phase 1–3 reports.

---

## Purpose

This report answers the central question:

> What standardized architecture should govern every operator-facing feedback element in the Kurash Tournament Suite?

The design is derived from three completed investigation reports:
- **Phase 1 Report** (`UI-Trustworthiness-Analysis-Report.md`): ~95+ toast call sites, 37 indicator categories, 15 modals, 19 composables, 9 broadcast events mapped
- **Phase 2 Report** (`UI-Trustworthiness-Phase2-Report.md`): Audience analysis, information quality, notification importance, state source visibility
- **Phase 3 Report** (`UI-Trustworthiness-Phase3-State-Authority-Report.md`): Complete state authority matrix for 6 subsystems, invariant verification, architecture assessment

---

## Table of Contents

1. [Trust Model](#1-trust-model)
2. [Notification Design Standard](#2-notification-design-standard)
3. [Indicator Design Standard](#3-indicator-design-standard)
4. [State-to-UI Mapping](#4-state-to-ui-mapping)
5. [Phased Implementation Roadmap](#5-phased-implementation-roadmap)
6. [Risks, Assumptions, and Open Questions](#6-risks-assumptions-and-open-questions)

---

# 1. Trust Model

## 1.1 Architectural Principles

Every operator-facing feedback element must follow these five principles. These are non-negotiable design constraints derived from the investigation findings.

### Principle 1: Single Authoritative Source

Every UI element traces to exactly one composable or state owner. No UI element may derive from multiple conflicting sources. The investigation confirmed this is already the architecture:

| UI Element | Authoritative Owner | Evidence |
|------------|---------------------|----------|
| ON GILAM badge | `getManualItemStatus()` in `refereeController.setup.ts:693` | `manualQueue[0]` + `activeQueueSource` |
| NEXT badge | `getManualItemStatus()` | `manualQueue[1]` |
| Connected badge | `connectionState` computed in `useRefereeControllerSyncPanels.ts:285` | 12+ upstream refs |
| Live Snapshot badge | `queueSourceMode` ref in `useRefereeQueueSync.ts` | `queue_api` + `!queueIsDegraded` |
| Scoreboard scores | `gameState` reactive in `refereeController.setup.ts` | Controller mutations → broadcast |
| Display Live badge | `WindowManager` in `window-manager.js` | BrowserWindow Map |
| Pairing state | `useRefereeControllerSession.ts` | Token existence + heartbeat result |

**Design rule:** If two UI elements could show conflicting information about the same state, one must be the authority and the other must be removed or made dependent on the authority.

### Principle 2: Deterministic Display Conditions

Every indicator's visibility is a pure function of state. No randomness, no timing-dependent visibility. The investigation confirmed all state transitions are deterministic (Phase 3 Report, Section 5.3).

**Design rule:** An indicator's appearance must be reproducible given the same input state. If state A produces indicator X, it must always produce indicator X.

### Principle 3: Clear Audience

Every toast is written for ONE audience. Technical details belong in diagnostics, not toasts.

| Audience | What they see | What they don't see |
|----------|---------------|---------------------|
| Referee | "Result saved." | "Sync: HTTP 200" |
| Event Host operator | "Queue refreshed." | "Saved to kurash_db" |
| Technical operator | Both, via diagnostics panel | Raw error text in toasts |

**Design rule:** Before writing a toast message, identify the audience. If the message contains HTTP codes, trace IDs, database names, or internal state names, it belongs in diagnostics only.

### Principle 4: No Inferred State

The UI never guesses, predicts, or interprets. Every label reflects actual application state. The investigation confirmed this is already the architecture — every state has one owner, every transition is deterministic (Phase 3 Report, Section 5.4).

**Design rule:** If the system does not know the answer, it must say "Unknown" or "Waiting" rather than guessing.

### Principle 5: Consistent Visual Language

Same state = same color everywhere. Different colors = meaningfully different states. The investigation found one inconsistency: `cached_queue` gets yellow (warning) while `legacy_adapter` gets gray (neutral), despite both representing "not live" data (Phase 2 Report, Risk 7).

**Design rule:** Color semantics must be consistent across all indicator categories. If two states look the same to an operator, they must be the same color.

---

## 1.2 Trust Thresholds

| Trust Level | Definition | Action |
|-------------|------------|--------|
| **Trusted** | State is deterministic, single-source, verified | No changes needed |
| **Wording Only** | State is correct, but message text needs improvement | Phase 1 improvements |
| **Condition Needs Work** | Display condition is complex or has edge cases | Phase 2-3 standardization |
| **Architectural Change** | State source is ambiguous or duplicated | Phase 4 cleanup |

**Investigation findings (Phase 1 Report, Section 4.10):**

| Trust Category | Estimated Percentage |
|----------------|---------------------|
| Category A (Trusted) | ~20% |
| Category B (Wording only) | ~30% |
| Category C (Condition needs work) | ~35% |
| Category D (Architectural changes) | ~15% |

**Target:** 100% of operator-facing feedback elements should reach Trust Level "Trusted" or "Wording Only" after implementation.

---

## 1.3 State Ownership Rules

### Rule 1: One Owner Per State Domain

| Domain | Owner Composable | Mutators |
|--------|------------------|----------|
| Queue statuses | `getManualItemStatus()` | `pushManualItemToGilam()`, `advanceManualQueue()`, `removeManualQueueItem()`, `clearManualQueue()` |
| Match/game state | `gameState` reactive | `handleScoreClick()`, `handlePenaltyClick()`, `handleStartPause()`, `handleWinnerToggle()`, `confirmResetTime()`, `handleUndo()` |
| Controller session | `useRefereeControllerSession.ts` | `submitControllerPairing()`, `clearControllerAuthState()`, `forgetControllerPairing()` |
| Connection state | `connectionState` computed | No direct mutators — recomputed from dependencies |
| Queue freshness | `queueSourceMode` ref | `applyQueuePayload()`, `applyCachedQueueSnapshot()`, `readLocalCacheMeta()` |
| Display state | `WindowManager` | Hardware events, `rescanDisplays()`, `updateSessionStateFromOutputs()` |
| Broadcast state | `WindowManager.updateSessionStateFromOutputs()` | State machine transitions |

### Rule 2: Scoreboard Is Always a Projection

The scoreboard never originates state. It only receives state from the controller via WebSocket/BroadcastChannel/localStorage. This is confirmed in Phase 3 Report, Section 5.4.

### Rule 3: Local Overrides Are Temporary

`localResultOverrides` create a temporary divergence between local and Event Host state. This is intentional and reconciled on next queue refresh. The divergence window is typically 5-10 seconds (queue poll interval).

---

# 2. Notification Design Standard

## 2.1 Toast Architecture

The current system has **2 toast slots** with distinct behaviors:

| Slot | Function | Closable | Default Timeout | Purpose |
|------|----------|----------|-----------------|---------|
| `status` | `showBanner()` | No | 3000ms | Status updates, sync messages |
| `result` | `showResultToast()` | Yes | 6500ms | Match result confirmations |

**Key implementation details (from subagent investigation):**

- **Implementation:** Inline in `refereeController.setup.ts` (not a shared composable)
- **Max visible:** 2 (`.slice(-2)` on computed list)
- **Deduplication:** None generic; one call-site guard (`lastNextMatchConflictBannerKey`)
- **Accessibility:** `role="status"` + `aria-live="polite"` on each toast
- **Cleanup:** Timers cleared in `onBeforeUnmount`

---

## 2.2 Proposed Tone System

| Tone | Use Case | Visual | Icon | Timeout |
|------|----------|--------|------|---------|
| `success` | Operation completed successfully | Green (`border-emerald-500/45 bg-emerald-950/85 text-emerald-50`) | `CheckCircle2` | 2500ms |
| `error` | Operation failed, action needed | Red (`border-rose-500/45 bg-rose-950/85 text-rose-50`) | `XCircle` | 5000ms |
| `info` | State change notification | Blue (`border-blue-500/45 bg-slate-900/90 text-blue-50`) | `RefreshCw` | 3000ms |
| `warning` | Degraded state, attention needed | Amber (`border-amber-500/45 bg-amber-950/85 text-amber-50`) | `AlertTriangle` | 4000ms |

**Missing tone:** The current system only supports `success | error | info`. A `warning` tone is needed for degraded-but-functional states (cached queue, partial degradation).

**Current timeout ranges observed:**

| Timeout Range | Typical Tone | Context |
|---------------|--------------|---------|
| 2000-2200ms | success | Short confirmations (tournament refreshed, sync refreshed) |
| 2500ms | success/error | Online/offline state changes, reconnection notifications |
| 3000ms | info (default) | Default; in-progress operations ("Saving match list...") |
| 3500-4000ms | error | Invalid address errors, display management errors |
| 4500-5000ms | error | Connection failures, setup refresh failures |
| 5200ms | info/error | Next-match conflict banners, rollback-recovery messages |
| 6500ms | info/error | Important messages, large error details |
| 8000-8500ms | error | Critical errors (ROLLBACK_SEQUENCE_CONFLICT) |

**Proposed standardization:** Tones should determine timeout, not call-sites. This eliminates the current inconsistency where some critical errors have shorter timeouts than informational messages.

---

## 2.3 Toast Priority Levels

| Priority | Tone | Behavior | Examples |
|----------|------|----------|----------|
| **CRITICAL** | error | Show immediately, 5s timeout, not dismissable during action | Result submission failure, session invalid, ROLLBACK_SEQUENCE_CONFLICT |
| **HIGH** | error/warning | Show immediately, 4-5s timeout | Connection lost, queue degraded, controller pairing failure |
| **MEDIUM** | info/warning | Show, 3-4s timeout | Queue refreshed, match loaded, connection status change |
| **LOW** | success/info | Show, 2-3s timeout | Tournament refreshed, settings saved, sync completed |

---

## 2.4 Message Format Standard

### Three-Part Error Pattern (existing, should be mandatory)

```
[What happened]. [Why it happened]. [What to do next].
```

**Example (from Phase 1 Report):**
> "Result was not accepted because this match changed on Event Host. The queue was refreshed. Please load the updated match before continuing."

**Breakdown:**
- What happened: "Result was not accepted"
- Why it happened: "because this match changed on Event Host"
- What to do next: "Please load the updated match before continuing"

### Success Pattern

```
[Operation] completed. [Optional context].
```

**Example:**
> "Winner submitted. Match #103 is now ON GILAM."

### Info Pattern

```
[State change description]. [Optional: what this means].
```

**Example:**
> "Queue refreshed. 3 matches are ready."

### Warning Pattern (new)

```
[Condition]. [What this means]. [Optional: what to do].
```

**Example:**
> "Queue is using saved data. Updates from Event Host may be delayed."

---

## 2.5 Deduplication Rules

| Rule | Behavior | Implementation |
|------|----------|----------------|
| Same message within 5 seconds | Deduplicate (suppress duplicate) | Timestamp-based guard |
| Same message type within 1 second | Replace (not queue) | Single-slot replacement (existing) |
| Status toast | Always replace (single-slot behavior) | Existing `statusBanner` ref |
| Result toast | Queue (separate slot) | Existing `resultPopupMessage` ref |

**Current call-site guard example:**
```typescript
// From refereeController.setup.ts:6353-6360
const lastNextMatchConflictBannerKey = ref('');
// ... composite key of [finishedMatchId, currentMatchId, candidateId].join('|')
// Banner only shown if key has changed since last time
```

**Proposed:** Extend this pattern to a generic deduplication mechanism.

---

## 2.6 Accessibility Standard

| Requirement | Current | Proposed |
|-------------|---------|----------|
| Screen reader announcement | `role="status"` + `aria-live="polite"` | Add `aria-atomic="true"` |
| Keyboard dismissal | Only result toast has close button | All toasts should be dismissable |
| Keyboard shortcut | None | Escape to dismiss all |
| Color contrast | Tailwind opacity classes | Verify WCAG AA compliance |
| Animation | None | Respect `prefers-reduced-motion` |

---

## 2.7 Toast Priority Queue & Overflow Handling

**Risk Level:** CRITICAL
**Rationale:** The current 2-slot `.slice(-2)` limit means CRITICAL toasts (result submission failure, session invalid) can be suppressed by simultaneous HIGH toasts (connection lost, queue degradation). This defeats the priority system.

### Proposed Architecture: Priority Queue with Slot Guarantee

```
┌─────────────────────────────────────────────────┐
│                 Toast Manager                    │
├─────────────────────────────────────────────────┤
│  Priority Queue (in-memory)                     │
│  ┌─────────┬─────────┬─────────┬─────────┐     │
│  │CRITICAL │  HIGH   │ MEDIUM  │   LOW   │     │
│  │(5 slots)│(3 slots)│(2 slots)│(1 slot) │     │
│  └─────────┴─────────┴─────────┴─────────┘     │
│                                                 │
│  Display Slots (2 visible)                      │
│  ┌─────────────────────┬─────────────────────┐ │
│  │   Primary Slot       │  Secondary Slot     │ │
│  │   (CRITICAL/HIGH)    │  (MEDIUM/LOW)       │ │
│  └─────────────────────┴─────────────────────┘ │
│                                                 │
│  Rules:                                         │
│  1. CRITICAL always gets primary slot           │
│  2. If primary occupied, HIGH gets secondary    │
│  3. MEDIUM/LOW wait in queue                    │
│  4. Max 3 toasts per minute (circuit breaker)  │
│  5. Dedup: same message within 5s suppressed    │
└─────────────────────────────────────────────────┘
```

### State Machine

```
IDLE → SHOWING (toast appears)
SHOWING → DISMISSING (timeout or manual close)
DISMISSING → IDLE (toast removed)
SHOWING → REPLACING (higher priority arrives)
REPLACING → SHOWING (new toast displayed)
```

### Circuit Breaker

```typescript
const TOAST_RATE_LIMIT = {
  maxPerMinute: 3,
  windowMs: 60_000,
  penaltyMs: 10_000,  // Suppress all toasts for 10s if limit exceeded
};

function canShowToast(): boolean {
  const now = Date.now();
  const recentToasts = toastTimestamps.filter(t => now - t < TOAST_RATE_LIMIT.windowMs);
  if (recentToasts.length >= TOAST_RATE_LIMIT.maxPerMinute) {
    // Circuit breaker triggered — suppress non-CRITICAL toasts
    return false;
  }
  return true;
}
```

### Migration from Current System

| Current | Proposed | Migration Path |
|---------|----------|----------------|
| 2 independent refs (`statusBanner`, `showResultPopup`) | 1 priority queue + 2 display slots | Phase 4.2: Extract into composable |
| `.slice(-2)` hard limit | Priority-based slot assignment | Replace in composable extraction |
| No rate limiting | 3 toasts/minute circuit breaker | Add in composable extraction |
| No deduplication | 5-second dedup window | Add in Phase 3c |

### Backward Compatibility

The existing `showBanner()` and `showResultToast()` function signatures will be preserved as **convenience wrappers** around the new priority queue. This ensures:
1. No breaking changes to existing composable injection patterns
2. Existing call sites continue to work without modification
3. New code can use the priority queue directly for finer control

---

# 3. Indicator Design Standard

## 3.1 Color Semantics

| Color | Meaning | Use Cases | CSS Classes |
|-------|---------|-----------|-------------|
| **Green** (emerald) | Trustworthy, live, connected, complete | Connected, Live Snapshot, ON GILAM, READY | `bg-emerald-500/20 border-emerald-500/40 text-emerald-300` |
| **Amber** (yellow) | Attention needed, degraded, pending | Cached data, degraded queue, next in queue | `bg-amber-500/20 border-amber-500/40 text-amber-300` |
| **Blue** | In progress, transitioning | Reconnecting, syncing, recovering | `bg-blue-500/20 border-blue-500/40 text-blue-300` |
| **Red** (rose) | Error, critical, hidden | Offline, error, HIDDEN display class | `bg-rose-500/20 border-rose-500/40 text-rose-300` |
| **Gray** (slate) | Inactive, completed, neutral | Completed, idle, legacy | `bg-slate-500/20 border-slate-400/40 text-slate-200` |
| **Cyan** | On mat (ring display) | ON MAT role | `bg-cyan-500/20 border-cyan-400/40 text-cyan-200` |

---

## 3.2 Indicator Categories

### Category 1: Queue Role Indicators (Ring Display Slots)

**Source of truth:** `RingDisplayRole` type in `useRingDisplayQueue.ts:10`

| Role | Label | Color | CSS Classes |
|------|-------|-------|-------------|
| `ON_MAT` | "On Gilam" | Cyan | `bg-cyan-500/20 border-cyan-400/40 text-cyan-200` |
| `ON_DECK` | "On Deck" | Blue | `bg-blue-500/20 border-blue-400/40 text-blue-200` |
| `IN_QUEUE` | "In Queue" | Gray | `bg-slate-500/20 border-slate-400/30 text-slate-200` |
| `ON_HOLD` | "On Hold" | Amber | `bg-amber-500/20 border-amber-400/40 text-amber-200` |
| `EMPTY` | "Empty" | White/Gray | `bg-white/5 border-white/10 text-slate-400` |

**Rendered at:** `refereeController.template.html:447-458`

**Role assignment logic:**
- Live Event Host queue: index 0 = `ON_MAT`, index 1 = `ON_DECK`, rest = `IN_QUEUE` (from `useRingDisplayQueue.ts:452`)
- Manual queue: index 0 = `ON_MAT` or `ON_HOLD` (depending on `activeQueueSource`), index 1 = `ON_DECK`, rest = `IN_QUEUE` (from `refereeController.setup.ts:1813-1828`)

---

### Category 2: Manual Queue Status Indicators

**Logic source:** `getManualItemStatus()` in `refereeController.setup.ts:693-701`

Returns: `'active' | 'next' | 'queued' | 'completed'`

| Status | Display Label | Card Color | Badge Color |
|--------|--------------|------------|-------------|
| `active` + event-host source | **ON HOLD** | Amber | `bg-amber-500/20 text-amber-400` |
| `active` + manual source | **ON GILAM** | Green | `bg-emerald-500/20 text-emerald-400` |
| `next` | **NEXT** | Amber | `bg-amber-500/20 text-amber-400` |
| `completed` | **DONE** | Gray (dimmed) | `bg-white/5 text-gray-600` |
| `queued` (default) | **QUEUED** | Neutral | `bg-rose-400/15 text-rose-300` |

**Rendered at:** `refereeController.template.html:2213-2283`

---

### Category 3: Display Class Indicators

**Source of truth:** `RingQueueDisplayClass` type in `useRingDisplayQueue.ts:1-7`

```
type RingQueueDisplayClass = 'READY' | 'PROVISIONAL' | 'AUTO_ADVANCE' | 'HIDDEN' | 'COMPLETED'
```

| Display Class | Color | CSS Classes | Fallback Priority | Displayable |
|---------------|-------|-------------|-------------------|-------------|
| `READY` | Green | `bg-emerald-500/20 border-emerald-500/40 text-emerald-300` | 100 | Yes |
| `PROVISIONAL` | Amber | `bg-amber-500/20 border-amber-500/40 text-amber-300` | 50 | Yes |
| `AUTO_ADVANCE` | Fuchsia | `bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300` | 0 | No |
| `COMPLETED` | Gray | `bg-slate-500/20 border-slate-500/30 text-slate-300` | 0 | No |
| `HIDDEN` | Rose | `bg-rose-500/20 border-rose-500/40 text-rose-300` | 0 | No |

**Rendered at:** `refereeController.template.html:466-478` (preview slots), `1266-1277` (full queue table)

---

### Category 4: Connection State / Sync Primary State Indicators

**Connection state type:** `ConnectionState` in `useRefereeControllerSyncPanels.ts:20-25`

```
type ConnectionState = 'setup_needed' | 'reconnecting' | 'connected' | 'connected_warn' | 'offline'
```

| ConnectionState | Label | Badge Color | Dot Color |
|-----------------|-------|-------------|-----------|
| `setup_needed` (no server) | "Event Host needed" | Amber | Amber |
| `setup_needed` (known device, no assignment) | "Waiting for Event Host assignment" | Amber | Amber |
| `setup_needed` (other) | "Choose tournament to continue recovery" | Amber | Amber |
| `reconnecting` | "Reconnecting" | Blue | Blue |
| `connected` | "Connected" | Green | Green |
| `connected_warn` | "Connected with warnings" | Yellow | Yellow |
| `offline` (with matches/sync) | "Known device offline" | Orange | Orange |
| `offline` (fallback) | "Disconnected" | Red | Red |

**Rendered at:** `refereeController.template.html:163-176`

---

### Category 5: Pairing State Indicators

**Pairing state type:** `PairingState` in `useRefereeControllerSyncPanels.ts:26-30`

```
type PairingState = 'unpaired' | 'pairing' | 'paired_known_device' | 'pair_failed'
```

| PairingState | Label | Color |
|--------------|-------|-------|
| `pairing` | "Pairing" | Blue |
| `pair_failed` | "Pair failed" | Red |
| `paired_known_device` | "Known device" | Green |
| `unpaired` (default) | "Unpaired" | Amber |

**Rendered at:** `RefereeConnectionPanel.vue:25-30` (top-right badge), `117-122` (bottom summary badge)

---

### Category 6: Queue Freshness Indicators

**Computed at:** `useRefereeControllerSyncPanels.ts:439-473`

| Condition | Label | Color |
|-----------|-------|-------|
| `recovering` snapshot mode | "Recovering Live Snapshot" | Blue |
| Loading matches | "Syncing" | Blue |
| Not config ready | "Choose tournament to continue recovery" | Amber |
| Live queue_api | "Live Snapshot" | Green |
| Cached or offline queue | "Cached Snapshot" / "Offline Snapshot" | Yellow |
| Legacy adapter | "Legacy Snapshot Fallback" | Gray |
| Idle (default) | "Idle" | White/Gray |

**Rendered at:** `refereeController.template.html:373-379` (Queue Snapshot header), `688-695` (Support Details button), `946-952` (Recovery/Snapshot section)

---

## 3.3 State-to-Color Mapping Rules

1. **Live/Connected = Green** — Always
2. **Cached/Saved = Amber** — Always (not gray, not yellow-then-gray)
3. **Transitioning = Blue** — Always
4. **Error/Offline = Red** — Always
5. **Inactive/Completed = Gray** — Always

**Rule:** If two states look the same to an operator, they should be the same color. If they look different, they should be different colors.

**Current inconsistency found (Phase 2 Report, Risk 7):**
- `cached_queue` gets yellow (warning) visual treatment
- `legacy_adapter` gets gray (neutral) visual treatment
- Both represent "not live" data from operator perspective
- **Proposed fix:** Both should be amber (attention needed, degraded)

---

## 3.4 Badge Consistency Rules

| Rule | Rationale |
|------|-----------|
| Badge text must be operator-friendly, not internal names | "Live Snapshot" not "queue_api" |
| Badge color must match semantic meaning | Green = good, Amber = attention, Red = bad |
| Badge must be visible at a glance | Consistent sizing, placement, contrast |
| Badge must not duplicate information already shown elsewhere | Avoid redundant indicators |

---

# 4. State-to-UI Mapping

## 4.1 Queue Subsystem

| State | Authoritative Owner | Toast | Indicator | UI Element |
|-------|---------------------|-------|-----------|------------|
| ON GILAM | `getManualItemStatus()` | — | Green badge | Template badge, Gilam display |
| NEXT | `getManualItemStatus()` | — | Amber badge | Template badge, Gilam ON_DECK |
| QUEUED | `getManualItemStatus()` | — | Gray badge | Template badge, Gilam IN_QUEUE |
| ON HOLD | `getManualItemStatus()` | — | Amber badge | Template badge, override indicator |
| DONE | `getManualItemStatus()` | — | Gray badge | Template badge, row styling |

**State flow (from Phase 3 Report, Section 2.1):**
```
QUEUED (index >= 2)
    |
    pushManualItemToGilam() or advanceManualQueue()
    v
ON GILAM (index 0, manual mode)  -->  NEXT (index 1)
    |
    advanceManualQueue() (result submitted)
    v
ON HOLD (index 0, event-host mode)
```

**Invariant:** At most one item can be ON GILAM at a time. At most one item can be NEXT at a time. ON GILAM requires `activeQueueSource === 'manual'`.

---

## 4.2 Match Subsystem

| State | Authoritative Owner | Toast | Indicator | UI Element |
|-------|---------------------|-------|-----------|------------|
| Current Match | `gameState` reactive | — | — | Controller template, scoreboard (via broadcast) |
| Loaded Match | `currentMatchId` | — | — | `matchIdLabel`, ring mismatch guard, rollback guard |
| Active Match (Scoreboard) | Scoreboard (derived) | — | — | Scoreboard template (projection only) |
| Manual Queue Match | `manualQueue` ref | — | — | `getManualItemStatus()`, `publishManualQueueToGilam()` |

**Invariant:** Only one match is Current at a time. `gameState.winner` can only be null, 'player1', or 'player2'. Every gameState mutation must be broadcast.

---

## 4.3 Controller/Session Subsystem

| State | Authoritative Owner | Toast | Indicator | UI Element |
|-------|---------------------|-------|-----------|------------|
| Unpaired | Session composable | — | Amber badge | `pairingStateLabel` ("Unpaired") |
| Pairing | Session composable | — | Blue badge | `pairingStateLabel` ("Pairing") |
| Paired (Known Device) | Session composable | — | Green badge | `pairingStateLabel` ("Known device") |
| Assigned | Session + Event Host | — | Green badge | `assignmentState` badge |
| Connected | `connectionState` computed | — | Green dot | `syncPrimaryState` badge |
| Reconnecting | `connectionState` computed | — | Blue dot | `syncPrimaryState` badge ("Reconnecting") |
| Offline | `connectionState` computed | Error toast | Red dot | `syncPrimaryState` badge ("Offline") |
| Invalid Session | Session + Event Host | Error toast | — | `pairingResetReasonLabel` |
| Expired | Session + Event Host | Error toast | — | `pairingResetReasonLabel` |

**Invariant:** `device_id` is NEVER cleared by `clearAuth()`. Only one Echo instance per page. `createKnownDeviceSessionGuard()` prevents stale async completions.

---

## 4.4 Connection/Freshness Subsystem

| State | Authoritative Owner | Toast | Indicator | UI Element |
|-------|---------------------|-------|-----------|------------|
| Live Snapshot | `queueSourceMode` ref | — | Green badge | `queueFreshnessLabel` ("Live Snapshot") |
| Cached Snapshot | `queueSourceMode` ref | Warning toast | Amber badge | `queueFreshnessLabel` ("Cached Snapshot") |
| Offline Snapshot | `queueSourceMode` ref | Error toast | Amber badge | `queueFreshnessLabel` ("Offline Snapshot") |
| Legacy Snapshot | `queueSourceMode` ref | — | Gray badge | `queueFreshnessLabel` ("Legacy Snapshot Fallback") |
| Recovery Mode | `snapshotMode` computed | Info toast | Blue badge | `snapshotModeLabel` ("Recovering Live Snapshot") |

**Invariant:** `connected` requires `!reconnecting && isOnline && !queueIsDegraded`. `queue_api` mode implies `queueIsDegraded === false`. `offline_cache` implies `isOnline === false`.

---

## 4.5 Display Management Subsystem

| State | Authoritative Owner | Toast | Indicator | UI Element |
|-------|---------------------|-------|-----------|------------|
| Active Display | `WindowManager` | — | — | Display panel UI |
| Connected Display | `WindowManager` | — | — | `isScoreboardLive`, per-display status |
| Broadcast State | `WindowManager` | — | — | `scoreboardStatusLabel`, `scoreboardStatusToneClass` |
| Partial Degradation | `WindowManager` | Warning toast | Amber badge | "Broadcast Degraded" label |

**Invariant:** A display can only be live for one role at a time. `live` requires at least one live window AND no issues. `partially_degraded` requires at least one live window.

---

## 4.6 Broadcast/Scoreboard Subsystem

| State | Authoritative Owner | Toast | Indicator | UI Element |
|-------|---------------------|-------|-----------|------------|
| Scoreboard State | Referee Controller (`gameState`) | — | — | Scoreboard template (projection only) |
| Broadcast Connection | Laravel Echo/Reverb | — | — | Managed by Pusher protocol |
| BroadcastChannel State | Referee Controller | — | — | Transport, not source |
| Ring Match Order Projection | Referee Controller | — | — | Ring match order page |

**Invariant:** Scoreboard is always a projection. Timer never jumps backward during normal operation. `updatedAt` timestamp is always set at send time. BroadcastChannel messages are deep-cloned.

---

## 4.7 Complete Data Flow

```
Server (Event Host)
    |
    v
useRefereeQueueSync.ts  (fetches queue, applies payload)
    |
    +---> queueSourceMode (ref)  -----> useRefereeControllerSyncPanels.ts
    |                                    |-- syncSourceLabel (computed)
    |                                    |-- syncModeLabel (computed)
    |                                    |-- queueFreshnessLabel (computed)
    |                                    |-- queueFreshnessToneClass (computed)
    |                                    |-- connectionState (computed)
    |                                    +-- snapshotMode (computed)
    |
    +---> queueIsDegraded (ref) -----> useRefereeControllerSyncPanels.ts
    |                                    |-- isAdminRecoveryLocked (computed)
    |                                    |-- canExitFallbackAndResync (computed)
    |                                    |-- showRecoverySetupPanel (computed)
    |                                    +-- resultSubmitQueueMode (computed)
    |
    +---> queueDegradedReason (ref) -> syncFallbackReasonLabel (computed)
    |                                    +-- currentConnectionWarningLabel (computed)
    |
    +---> matchesList (ref) --------> useRefereeControllerQueuePreview.ts
    |                                    |-- matchesListForSlots (computed)
    |                                    |-- displaySlots (computed via buildDisplaySlots)
    |                                    +-- buildLocalRingMatchOrderProjectionPayload()
    |
    +---> localResultOverrides (ref) -> applyLocalResultOverrides()
    |                                    |-- Modifies row status, winner, display_class
    |                                    +-- Persists to localStorage (sb_result_overrides_*)
    |
    +---> refereeQueueStorage.ts ----> writeQueueCacheToStorage() / readQueueCacheFromStorage()
                                         |-- Scope-keyed localStorage persistence
                                         +-- In-memory dedup map for write optimization

Controller (refereeController.setup.ts)
    |
    +---> publishLocalScoreboardState() ---> BroadcastChannel (kurash:scoreboard-state:v1)
    |                                        +-- localStorage (kurash:scoreboard-state:snapshot)
    |
    v
Scoreboard (kurashScoreBoard.vue)
    |
    +---> BroadcastChannel.onmessage -----> handleLocalScoreboardMessage()
    |                                        +-- applyIncomingSnapshotState()
    |                                             +-- applyBroadcastSnapshot()
    |                                                  |-- applyTimerPayload()      -> time, isRunning, mode flags
    |                                                  |-- applyScorePayload()       -> scores, penalties, medic counts
    |                                                  |-- applyPlayerTextPayload()  -> names, countries, flags
    |                                                  |-- applyPlayerImagesPayload()-> club logos
    |                                                  |-- applyWinnerPayload()      -> winner ref
    |                                                  |-- applyBreakPayload()       -> isBreakTime
    |                                                  |-- applyMedicPayload()       -> isMedicMode
    |                                                  +-- applyJazoPayload()        -> isJazoMode
    |
    +---> localStorage 'storage' event --> handleLocalScoreboardStorage() -> same apply chain
    +---> /broadcast/state fetch --------> hydrateBroadcastState() (fallback poll)

Ring Display (ringMatchOrder.vue)
    |
    +---> BroadcastChannel.onmessage -----> handleProjectionMessage()
    |                                        +-- Recomputes targetBoardCards
    |                                             +-- applyIncomingBoard()
    |                                                  |-- Card transition animations (completing, advancing)
    |                                                  +-- CSS class assignment:
    |                                                       |-- ring-order-card--on-mat / --next / --queued / --placeholder
    |                                                       +-- ring-order-center-orb--on-mat / --queued / --completed / --waiting
```

---

# 5. Phased Implementation Roadmap

## 5.0 Phase 0: Automated Regression Baseline

**Risk Level:** LOW
**Impact Level:** CRITICAL
**Estimated Effort:** 2-3 days

### Rationale

The existing E2E test suite provides **zero regression protection**. All indicator tests use `expect(true).toBeTruthy()` — a no-op assertion that always passes regardless of whether the indicator actually toggled, appeared, or was styled correctly. Before any UI Trustworthiness work begins, a meaningful regression baseline must be established.

### Tasks

| # | Task | Files | Effort | Rationale |
|---|------|-------|--------|-----------|
| 0.1 | Fix E2E launcher (KTS process exits immediately via WMI) | `tests/e2e/desktop/launcher.ts` | 1 day | Pre-existing blocker — no E2E tests can run |
| 0.2 | Rewrite indicator tests with real visibility assertions | `tests/e2e/specs/workflow/indicators/01-indicator-system.spec.ts` | 0.5 days | Regression Guardian: CRITICAL gap |
| 0.3 | Add state-to-UI label mapping tests | `tests/e2e/specs/workflow/indicators/02-indicator-label-mapping.spec.ts` (new) | 0.5 days | Regression Guardian: HIGH gap |
| 0.4 | Add toast/banner system smoke tests | `tests/e2e/specs/workflow/toasts/01-toast-system.spec.ts` (new) | 0.5 days | Regression Guardian: CRITICAL gap |
| 0.5 | Add toast/indicator selectors to helpers | `tests/e2e/helpers/selectors.ts` | 0.25 days | Support new test assertions |

### Verification

- [ ] E2E launcher successfully starts KTS process
- [ ] All indicator tests pass with real assertions (not `expect(true).toBeTruthy()`)
- [ ] State-to-UI label mapping tests pass
- [ ] Toast system smoke tests pass
- [ ] Baseline test run produces a passing report

---

## 5.1 Phase 1: Wording Improvements

**Risk Level:** LOW
**Impact Level:** HIGH
**Estimated Effort:** 3-4 days

### Tasks

| # | Task | Files | Effort | Rationale |
|---|------|-------|--------|-----------|
| 1.1 | Fix 6 internal name leaks (HTTP codes, trace IDs, DB names) | `refereeController.setup.ts:4803,7950`, `useRefereeQueueSync.ts:866,869,1777` | 1-2 days | Phase 2 Report, Risk 1 |
| 1.2 | Fix 5 dual-audience messages (split referee vs Event Host) | `refereeController.setup.ts:7877,7924,4733,6355` | 1 day | Phase 2 Report, Risk 2 |
| 1.3 | Fix 15+ "Display controls" repeated messages (deduplicate) | `useRefereeDisplayManagement.ts` (15+ locations) | 0.5 days | Phase 2 Report, Risk 3 |
| 1.4 | Translate `queueDegradedReason` raw codes to tooltips | `refereeController.template.html:975-978` | 0.5 days | Phase 2 Report, State Source Visibility |

### Verification

- [ ] All HTTP status codes removed from operator-facing toasts
- [ ] All trace IDs removed from operator-facing toasts
- [ ] All database names removed from operator-facing toasts
- [ ] All dual-audience messages split into audience-specific messages
- [ ] "Display controls" message deduplicated (single guard, not 15+)
- [ ] `queueDegradedReason` tooltips translated to operator-friendly text

---

## 5.2 Phase 2: Indicator Corrections

**Risk Level:** LOW
**Impact Level:** HIGH
**Estimated Effort:** 2-3 days

### Tasks

| # | Task | Files | Effort | Rationale |
|---|------|-------|--------|-----------|
| 2.1 | Unify cached/legacy visual treatment (both = amber) | `useRefereeControllerSyncPanels.ts:455-473` | 0.5 days | Phase 2 Report, Risk 7 |
| 2.2 | Fix audience leaks in indicator labels | `useRefereeControllerSyncPanels.ts:368-395` | 1 day | Phase 2 Report, Risk 1 |
| 2.3 | Standardize indicator colors by semantic meaning | Multiple component files | 1-2 days | Trust Model Principle 5 |

### Verification

- [ ] `cached_queue` and `legacy_adapter` both use amber (not yellow vs gray)
- [ ] All indicator labels are operator-friendly (no internal names)
- [ ] All indicators follow color semantics (green=good, amber=attention, red=bad)

---

## 5.3 Phase 3: Toast Standardization

**Risk Level:** MEDIUM
**Impact Level:** HIGH
**Estimated Effort:** 6-9 days

### Tasks

| # | Task | Files | Effort | Rationale |
|---|------|-------|--------|-----------|
| 3.1 | Add `warning` tone to toast system | `refereeController.setup.ts:302` | 1-2 days | Phase 1 Report, Risk H1 |
| 3.2 | Standardize timeout values by priority | `refereeController.setup.ts:2564-2588` | 1 day | Phase 2 Report, Potential Risk B |
| 3.3 | Add deduplication logic (same message within 5s) | `refereeController.setup.ts` | 1 day | Phase 2 Report, Risk 3 |
| 3.4 | Audit and add recovery guidance to 60+ error toasts | `refereeController.setup.ts`, composables | 3-5 days | Phase 1 Report, Risk H3 |

### Verification

- [ ] `warning` tone available in `ControllerToastTone` type
- [ ] Timeouts standardized: success=2500ms, info=3000ms, warning=4000ms, error=5000ms
- [ ] Deduplication prevents same message within 5 seconds
- [ ] All error toasts include three-part pattern (what/why/what-to-do)

---

## 5.4 Phase 4: Architectural Cleanup

**Risk Level:** MEDIUM
**Impact Level:** MEDIUM
**Estimated Effort:** 5-8 days

### Tasks

| # | Task | Files | Effort | Rationale |
|---|------|-------|--------|-----------|
| 4.1 | Create centralized feedback registry (toast/indicator types) | New file | 2-3 days | Phase 1 Report, Risk H4 |
| 4.2 | Extract toast functions into reusable composable | New file | 1-2 days | Current implementation is inline |
| 4.3 | Add silent-but-should-notify toasts (5 events) | `refereeController.setup.ts` | 1 day | Phase 2 Report, Risk 4 |
| 4.4 | Silence LOW importance toasts (17 events) | Multiple files | 1-2 days | Phase 2 Report, Risk 3 |

### Verification

- [ ] Centralized registry exists with type definitions for all toasts/indicators
- [ ] Toast functions extracted into reusable composable
- [ ] 5 silent-but-should-notify events now produce toasts
- [ ] 17 LOW importance events silenced (UI state change is sufficient feedback)

---

## 5.5 Phase 5: QA & Validation

**Risk Level:** LOW
**Impact Level:** HIGH
**Estimated Effort:** 5-7 days

### Tasks

| # | Task | Files | Effort | Rationale |
|---|------|-------|--------|-----------|
| 5.1 | Verify every indicator traces to authoritative source | All indicator files | 2-3 days | Phase 3 Report success criteria |
| 5.2 | Test toast timeout/deduplication behavior | `refereeController.setup.ts` | 1 day | Standardization verification |
| 5.3 | Validate color consistency across all indicators | Multiple component files | 1 day | Trust Model Principle 5 |
| 5.4 | Accessibility audit (aria, keyboard, screen reader) | Template + component files | 1-2 days | Accessibility Standard |

### Verification

- [ ] Every indicator has documented authoritative source
- [ ] Toast timeouts match standard by tone
- [ ] All indicators follow color semantics consistently
- [ ] WCAG AA compliance verified

---

## 5.6 Implementation Summary

| Phase | Risk | Impact | Effort | Dependencies |
|-------|------|--------|--------|--------------|
| **Phase 0: Automated Regression Baseline** | LOW | CRITICAL | 2-3 days | None |
| Phase 1: Wording Improvements | LOW | HIGH | 3-4 days | Phase 0 |
| Phase 2: Indicator Corrections | LOW | HIGH | 2-3 days | Phase 0 |
| Phase 3: Toast Standardization | MEDIUM | HIGH | 6-9 days | Phase 0 + Phase 1 |
| Phase 4: Architectural Cleanup | MEDIUM | MEDIUM | 5-8 days | Phase 0 + Phase 1-2 |
| Phase 5: QA & Validation | LOW | HIGH | 5-7 days | Phase 0 + Phase 1-4 |
| **Total** | — | — | **23-34 days** | — |

---

# 6. Risks, Assumptions, and Open Questions

## 6.1 Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Adding `warning` tone changes existing semantics | Medium | Audit all `info` calls that should be `warning` first |
| Centralized registry adds upfront complexity | Medium | Start with type definitions, not full abstraction |
| Timeout standardization may break existing UX | Low | Test with operators before finalizing |
| Color changes may confuse existing operators | **CRITICAL** | See Section 6.6 — Rollback Strategy for Color Changes |
| 60+ error toasts need recovery guidance | Medium | Prioritize by importance (HIGH/MEDIUM first) |
| Toast composable extraction may break injection pattern | Medium | Maintain existing `showBanner` callback interface |
| 2-slot toast limit can suppress CRITICAL toasts | **CRITICAL** | See Section 2.7 — Toast Priority Queue & Overflow Handling |

---

## 6.2 Assumptions

1. The current toast system (inline in `refereeController.setup.ts`) is sufficient as a starting point — it will be refactored in Phase 4.2
2. The 2-toast display limit is preserved, but backed by a priority queue that ensures CRITICAL toasts are never suppressed (see Section 2.7)
3. The `warning` tone is missing and should be added
4. Operators prefer consistent colors over implementation-specific colors
5. The three-part error pattern is the preferred format
6. The existing `role="status"` + `aria-live="polite"` accessibility baseline is sufficient
7. The `lastNextMatchConflictBannerKey` deduplication pattern can be generalized
8. The `showBanner` callback injection pattern into composables should be preserved (as convenience wrappers around the priority queue)

---

## 6.3 Open Questions

| # | Question | Why It Matters | Recommended Default |
|---|----------|----------------|---------------------|
| 1 | Should the toast system be extracted into a reusable composable before adding the `warning` tone? | Affects implementation order | No — add warning tone first, extract later |
| 2 | What is the maximum acceptable toast message length? | Affects message format standard | 120 characters (fits 2 lines on mobile) |
| 3 | Should the "Display controls are only available in Electron" message be removed entirely? | Affects 15+ locations | Remove from toasts, show as inline notice only |
| 4 | Should the `queueDegradedReason` raw codes be exposed in diagnostics panel? | Affects debugging capability | Yes — expose in diagnostics, remove from tooltips |
| 5 | Is the 60-second heartbeat interval acceptable? | Affects assignment detection latency | Yes — acceptable for current use case |
| 6 | Should the "Sync" terminology be replaced with more specific verbs? | Affects message clarity | Yes — replace with "save", "refresh", "reconnect", "recover" as appropriate |
| 7 | Should every state-changing operation produce a toast? | Affects notification frequency | No — only HIGH/CRITICAL operations; LOW/MEDIUM use indicators |
| 8 | How many toasts per minute is acceptable for operators? | Affects notification fatigue | Maximum 3 toasts per minute |
| 9 | Should the native `alert()` in `Match.vue` be converted? | Affects consistency | Yes — convert to custom toast system |
| 10 | What trust threshold is acceptable for project completion? | Affects success criteria | 100% of operator-facing feedback at "Trusted" or "Wording Only" |

---

## 6.4 Success Criteria

| Criterion | Validation Method | Target |
|-----------|-------------------|--------|
| Automated regression baseline exists | E2E test suite passes with real assertions | Phase 0 complete |
| Every feedback element has one authoritative source | Phase 3 audit | 100% |
| Every status indicator has a deterministic display condition | Phase 3 verification | 100% |
| Every toast clearly communicates what changed | Phase 1 wording audit | 100% |
| No UI element can display misleading information | Phase 2 indicator audit | 100% |
| CRITICAL toasts are never suppressed by lower-priority toasts | Priority queue unit tests | 100% |
| Color changes are reversible within 5 minutes | CSS custom property rollback test | Verified |
| Operators can trust what the application communicates | Operator feedback survey | Subjective trust rating |

---

## 6.5 Rollback Strategy for Color Changes

**Risk Level:** CRITICAL
**Rationale:** Tournament environments cannot tolerate visual confusion during live events. Operators have been trained on current color semantics. Changing colors mid-tournament could cause misinterpretation of state.

### Strategy: CSS Custom Property Layer

All indicator colors will be defined as CSS custom properties on the root element. This allows:
1. **Instant rollback** — Revert to old colors by changing variable values
2. **Gradual migration** — Old and new colors can coexist during transition
3. **Operator communication** — Visual changelog can be distributed before color changes go live

### Implementation

```css
/* :root defined in main CSS or tailwind config */
:root {
  /* Trust Model Color Semantics */
  --kts-color-trustworthy: theme('colors.emerald.500');     /* Green — live, connected, complete */
  --kts-color-attention: theme('colors.amber.500');         /* Amber — degraded, pending */
  --kts-color-transitioning: theme('colors.blue.500');      /* Blue — in progress */
  --kts-color-error: theme('colors.rose.500');              /* Red — error, critical */
  --kts-color-inactive: theme('colors.slate.500');          /* Gray — inactive, completed */
  --kts-color-on-mat: theme('colors.cyan.500');             /* Cyan — on mat */

  /* Legacy colors (to be deprecated) */
  --kts-color-legacy-warning: theme('colors.yellow.500');   /* Old cached_queue color */
}
```

### Rollback Procedure

| Step | Action | Owner | Time |
|------|--------|-------|------|
| 1 | Pre-deploy: Distribute color change visual guide to operators | Event organizer | T-7 days |
| 2 | Deploy: Update CSS custom properties to new values | Developer | T-0 |
| 3 | Monitor: Watch for operator confusion reports | Support team | T+0 to T+24h |
| 4 | Rollback (if needed): Revert CSS custom properties to old values | Developer | < 5 minutes |

### Audit Requirement

Before any color change is deployed, ALL yellow usages across the codebase must be audited and mapped to the 6-color standard. This includes:
- `cached_queue` (currently yellow → amber)
- `connected_warn` (currently yellow)
- `ring_display` target badge (currently yellow)
- Any other yellow usage in indicator classes

---

## 6.6 Toast Priority Queue & Overflow Handling

**Risk Level:** CRITICAL
**Rationale:** The current 2-slot `.slice(-2)` limit means CRITICAL toasts (result submission failure, session invalid) can be suppressed by simultaneous HIGH toasts (connection lost, queue degradation). This defeats the priority system.

### Proposed Architecture: Priority Queue with Slot Guarantee

```
┌─────────────────────────────────────────────────┐
│                 Toast Manager                    │
├─────────────────────────────────────────────────┤
│  Priority Queue (in-memory)                     │
│  ┌─────────┬─────────┬─────────┬─────────┐     │
│  │CRITICAL │  HIGH   │ MEDIUM  │   LOW   │     │
│  │(5 slots)│(3 slots)│(2 slots)│(1 slot) │     │
│  └─────────┴─────────┴─────────┴─────────┘     │
│                                                 │
│  Display Slots (2 visible)                      │
│  ┌─────────────────────┬─────────────────────┐ │
│  │   Primary Slot       │  Secondary Slot     │ │
│  │   (CRITICAL/HIGH)    │  (MEDIUM/LOW)       │ │
│  └─────────────────────┴─────────────────────┘ │
│                                                 │
│  Rules:                                         │
│  1. CRITICAL always gets primary slot           │
│  2. If primary occupied, HIGH gets secondary    │
│  3. MEDIUM/LOW wait in queue                    │
│  4. Max 3 toasts per minute (circuit breaker)  │
│  5. Dedup: same message within 5s suppressed    │
└─────────────────────────────────────────────────┘
```

### State Machine

```
IDLE → SHOWING (toast appears)
SHOWING → DISMISSING (timeout or manual close)
DISMISSING → IDLE (toast removed)
SHOWING → REPLACING (higher priority arrives)
REPLACING → SHOWING (new toast displayed)
```

### Circuit Breaker

```typescript
const TOAST_RATE_LIMIT = {
  maxPerMinute: 3,
  windowMs: 60_000,
  penaltyMs: 10_000,  // Suppress all toasts for 10s if limit exceeded
};

function canShowToast(): boolean {
  const now = Date.now();
  const recentToasts = toastTimestamps.filter(t => now - t < TOAST_RATE_LIMIT.windowMs);
  if (recentToasts.length >= TOAST_RATE_LIMIT.maxPerMinute) {
    // Circuit breaker triggered — suppress non-CRITICAL toasts
    return false;
  }
  return true;
}
```

### Migration from Current System

| Current | Proposed | Migration Path |
|---------|----------|----------------|
| 2 independent refs (`statusBanner`, `showResultPopup`) | 1 priority queue + 2 display slots | Phase 4.2: Extract into composable |
| `.slice(-2)` hard limit | Priority-based slot assignment | Replace in composable extraction |
| No rate limiting | 3 toasts/minute circuit breaker | Add in composable extraction |
| No deduplication | 5-second dedup window | Add in Phase 3c |

### Backward Compatibility

The existing `showBanner()` and `showResultToast()` function signatures will be preserved as **convenience wrappers** around the new priority queue. This ensures:
1. No breaking changes to existing composable injection patterns
2. Existing call sites continue to work without modification
3. New code can use the priority queue directly for finer control

---

## 6.7 Appendix: File Reference

### Toast Notification Files

| File | Purpose | Toast Calls |
|------|---------|-------------|
| `resources/js/pages/refereeController.setup.ts` | Main controller setup | 46 |
| `resources/js/composables/useRefereeQueueSync.ts` | Queue synchronization | 13 |
| `resources/js/composables/useRefereeControllerSession.ts` | Controller pairing/session | 12 |
| `resources/js/composables/useRefereeDisplayManagement.ts` | Electron display management | 37 |
| `resources/js/pages/refereeController/useRefereeControllerDisplayManagement.ts` | Display management wrapper | 2 |
| `resources/js/pages/Match.vue` | Legacy match page | 1 |

### Status Indicator Files

| File | Purpose |
|------|---------|
| `resources/js/pages/refereeController.template.html` | Main template with indicators |
| `resources/js/components/Referee/RefereeConnectionPanel.vue` | Connection status |
| `resources/js/components/Referee/RefereeDisplayManagementPanel.vue` | Display management |
| `resources/js/components/Referee/RefereeFallbackRecoveryPanel.vue` | Fallback/recovery |
| `resources/js/pages/ringMatchOrder.vue` | Ring match order display |
| `resources/js/pages/kurashScoreBoard.vue` | Scoreboard display |

### State Management Files

| File | Purpose |
|------|---------|
| `resources/js/composables/useRefereeControllerSession.ts` | Auth/pairing state |
| `resources/js/composables/useRefereeQueueSync.ts` | Queue state |
| `resources/js/composables/useRefereeDisplayManagement.ts` | Display state |
| `resources/js/composables/useRingDisplayQueue.ts` | Queue normalization |
| `resources/js/composables/refereeQueueOverrides.ts` | Local result overrides |
| `resources/js/composables/useRefereeControllerSyncPanels.ts` | Sync panel labels |
| `resources/js/composables/useLocalScoreboardState.ts` | Cross-window scoreboard state |
| `resources/js/composables/useBroadcast.ts` | HTTP broadcast with batching |

---

**Report Status:** Design Proposal Ready for Stakeholder Review
**Next Action:** Await stakeholder decision on implementation priorities and open questions
