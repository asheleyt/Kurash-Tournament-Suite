# Notification Audit Report — Phase 4.3 + Phase 4.4 Consolidated

**Date:** July 8, 2026
**Scope:** All `showBanner()` callsites across 5 core files + silent error analysis
**Status:** READ-ONLY audit — no code changes applied

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total `showBanner()` callsites | 119 |
| Toasts to silence (Phase 4.4) | 42 |
| Silent events needing toast (Phase 4.3) | 23 |
| Net recommended toasts after changes | 100 |

---

## Phase 4.4 — Toasts to Silence

These toasts currently fire but provide **no operator value** because the UI already reflects the change, the event is purely informational, or it causes toast fatigue from routine/frequent triggers.

### Critical (0 to silence)

None — all critical toasts are essential.

### High (3 to silence)

| File | Line | Function | Message | Reason |
|------|------|----------|---------|--------|
| `refereeController.setup.ts` | 1607 | `connectToAdmin` | "WebSocket connected" | Connection status bar indicator already shows green; operator doesn't need a popup confirmation |
| `refereeController.setup.ts` | 1612 | `connectToAdmin` | "Disconnected" | Status bar indicator turns red; redundant toast |
| `refereeController.setup.ts` | 1615 | `connectToAdmin` | "Reconnecting..." | Status bar shows reconnection state |

### Medium (18 to silence)

| File | Line | Function | Message | Reason |
|------|------|----------|---------|--------|
| `refereeController.setup.ts` | 1593 | `connectToAdmin` | "Connected as referee" | Status bar already shows role; routine event |
| `refereeController.setup.ts` | 1627 | `fetchMatches` | "Matches loaded" | Match list UI updates automatically; confirmation is redundant |
| `refereeController.setup.ts` | 1784 | `handleSubmitResult` | "Result submitted" | Result card appears in queue immediately; UI feedback sufficient |
| `refereeController.setup.ts` | 1793 | `handleSubmitResult` | "Result submitted successfully" | Duplicate success toast |
| `refereeController.setup.ts` | 1837 | `handleSubmitResult` | "Result submitted" (retry path) | Retry success doesn't need separate confirmation |
| `refereeController.setup.ts` | 1873 | `broadcastResultToScoreboard` | "Broadcast to scoreboard" | Scoreboard output area shows the result; operator can see it |
| `refereeController.setup.ts` | 1911 | `broadcastResultToScoreboard` | "Broadcast to scoreboard" | Duplicate broadcast toast in retry path |
| `refereeController.setup.ts` | 1956 | `retryPendingResultSync` | "Retry sync completed" | Sync status shown in pending badge count |
| `useRefereeDisplayManagement.ts` | 129 | `launchScoreboard` | "Scoreboard launched" | Scoreboard window opens; visual confirmation |
| `useRefereeDisplayManagement.ts` | 143 | `launchScoreboard` | "Scoreboard window blocked" | Popup blocker notification shows in browser; operator action required there |
| `useRefereeDisplayManagement.ts` | 265 | `assignDisplayRole` | "Display role assigned" | Role badge updates in UI |
| `useRefereeDisplayManagement.ts` | 387 | `broadcastToScoreboard` | "Broadcast sent" | Scoreboard output shows the data |
| `useRefereeDisplayManagement.ts` | 412 | `broadcastToScoreboard` | "Broadcast failed" | Status bar shows error state |
| `useRefereeControllerSession.ts` | 234 | `pairDevice` | "Device paired" | Pairing badge updates; status bar shows connected state |
| `useRefereeControllerSession.ts` | 278 | `pairDevice` | "Pairing failed" | Error state reflected in UI; operator can retry from pairing screen |
| `useRefereeQueueSync.ts` | 289 | `syncQueue` | "Queue synced" | Queue list updates in real-time |
| `useRefereeQueueSync.ts` | 345 | `checkOnlineStatus` | "Online" | Connection indicator in status bar |
| `useRefereeQueueSync.ts` | 349 | `checkOnlineStatus` | "Offline" | Connection indicator turns red |

### Low (21 to silence)

| File | Line | Function | Message | Reason |
|------|------|----------|---------|--------|
| `refereeController.setup.ts` | 1578 | `connectToAdmin` | "Connecting..." | Status bar shows connecting state |
| `refereeController.setup.ts` | 1643 | `fetchMatches` | "Loading matches" | Loading spinner visible |
| `refereeController.setup.ts` | 1648 | `fetchMatches` | "Refreshing matches" | Loading state shown |
| `refereeController.setup.ts` | 1719 | `handleSubmitResult` | "Submitting result" | Button shows loading state |
| `refereeController.setup.ts` | 1728 | `handleSubmitResult` | "Retrying submission" | Retry indicator shown |
| `refereeController.setup.ts` | 1855 | `broadcastResultToScoreboard` | "Broadcasting..." | Broadcast indicator shown |
| `refereeController.setup.ts` | 1898 | `broadcastResultToScoreboard` | "Retrying broadcast" | Retry indicator |
| `refereeController.setup.ts` | 1941 | `retryPendingResultSync` | "Syncing pending results" | Pending badge shows count |
| `refereeController.setup.ts` | 2001 | `loadLiveSnapshotRecovery` | "Recovering snapshot" | Recovery progress indicator |
| `useRefereeDisplayManagement.ts` | 108 | `launchScoreboard` | "Launching scoreboard" | Button loading state |
| `useRefereeDisplayManagement.ts` | 189 | `assignDisplayRole` | "Assigning role" | Loading spinner |
| `useRefereeDisplayManagement.ts` | 223 | `assignDisplayRole` | "Unassigning role" | Loading spinner |
| `useRefereeDisplayManagement.ts` | 345 | `broadcastToScoreboard` | "Broadcasting" | Loading state |
| `useRefereeControllerSession.ts` | 198 | `pairDevice` | "Pairing device" | Loading spinner on button |
| `useRefereeControllerSession.ts` | 312 | `loadSnapshotRecovery` | "Loading snapshot" | Loading state |
| `useRefereeQueueSync.ts` | 212 | `loadTournamentData` | "Loading tournament" | Full-screen loader |
| `useRefereeQueueSync.ts` | 234 | `loadTournamentData` | "Loading matches" | Full-screen loader |
| `useRefereeQueueSync.ts` | 267 | `syncQueue` | "Syncing queue" | Sync indicator |
| `useRefereeQueueSync.ts` | 301 | `checkOnlineStatus` | "Checking connection" | Connection check indicator |
| `useRefereeQueueSync.ts` | 323 | `checkOnlineStatus` | "Connection restored" | Indicator turns green |
| `useRefereeQueueSync.ts` | 367 | `loadLiveSnapshotRecovery` | "Recovering" | Recovery progress bar |

---

## Phase 4.3 — Silent Events That Should Notify

These error conditions currently set `displayErrorMessage` or are swallowed without showing a toast. Operators should be explicitly notified.

### Critical (8 events)

| File | Line | Function | Current Behavior | Recommended Toast |
|------|------|----------|------------------|-------------------|
| `refereeController.setup.ts` | 1667 | `handleSubmitResult` catch | Sets `displayErrorMessage` only | Error toast: "Result submission failed — data saved for retry" |
| `refereeController.setup.ts` | 1708 | `handleSubmitResult` catch | Sets `displayErrorMessage` only | Error toast: "Submission failed — check connection" |
| `refereeController.setup.ts` | 1762 | `handleSubmitResult` catch | Sets `displayErrorMessage` only | Error toast: "Submission error — pending sync will retry" |
| `refereeController.setup.ts` | 1821 | `handleSubmitResult` catch | Sets `displayErrorMessage` only | Error toast: "Retry submission failed" |
| `refereeController.setup.ts` | 1891 | `broadcastResultToScoreboard` catch | Swallowed silently | Error toast: "Scoreboard broadcast failed" |
| `useRefereeDisplayManagement.ts` | 378 | `broadcastToScoreboard` catch | Swallowed silently | Error toast: "Broadcast failed — data not sent to scoreboard" |
| `useRefereeControllerSession.ts` | 289 | `pairDevice` catch | Swallowed silently | Error toast: "Device pairing failed — check network" |
| `useRefereeQueueSync.ts` | 398 | `loadLiveSnapshotRecovery` catch | Swallowed silently | Error toast: "Snapshot recovery failed — data may be stale" |

### High (9 events)

| File | Line | Function | Current Behavior | Recommended Toast |
|------|------|----------|------------------|-------------------|
| `refereeController.setup.ts` | 1598 | `connectToAdmin` catch | Sets `displayErrorMessage` only | Warning toast: "WebSocket connection failed" |
| `refereeController.setup.ts` | 1634 | `fetchMatches` catch | Sets `displayErrorMessage` only | Warning toast: "Failed to load matches" |
| `refereeController.setup.ts` | 1949 | `retryPendingResultSync` catch | Swallowed silently | Warning toast: "Pending result sync failed" |
| `useRefereeDisplayManagement.ts` | 136 | `launchScoreboard` catch | Swallowed silently | Warning toast: "Scoreboard launch failed" |
| `useRefereeDisplayManagement.ts` | 196 | `assignDisplayRole` catch | Swallowed silently | Warning toast: "Display role assignment failed" |
| `useRefereeControllerSession.ts` | 241 | `pairDevice` catch | Swallowed silently | Warning toast: "Device pairing error" |
| `useRefereeControllerSession.ts` | 319 | `loadSnapshotRecovery` catch | Swallowed silently | Warning toast: "Snapshot recovery error" |
| `useRefereeQueueSync.ts` | 219 | `loadTournamentData` catch | Swallowed silently | Warning toast: "Tournament data load failed" |
| `useRefereeQueueSync.ts` | 356 | `checkOnlineStatus` catch | Swallowed silently | Warning toast: "Connection check failed" |

### Medium (6 events)

| File | Line | Function | Current Behavior | Recommended Toast |
|------|------|----------|------------------|-------------------|
| `refereeController.setup.ts` | 1658 | `handleSubmitResult` (validation) | Sets `displayErrorMessage` only | Info toast: "Validation error — check inputs" |
| `useRefereeDisplayManagement.ts` | 272 | `assignDisplayRole` (already assigned) | Silent | Info toast: "Display already has this role" |
| `useRefereeDisplayManagement.ts` | 308 | `assignDisplayRole` (invalid role) | Silent | Info toast: "Invalid display role specified" |
| `useRefereeControllerSession.ts` | 258 | `pairDevice` (invalid token) | Silent | Info toast: "Invalid pairing token" |
| `useRefereeQueueSync.ts` | 295 | `syncQueue` (queue empty) | Silent | Info toast: "No pending items to sync" |
| `useRefereeControllerDisplayManagement.ts` | 156 | `broadcastRingMatchOrder` catch | Swallowed silently | Info toast: "Ring match order broadcast failed" |

---

## Per-File Breakdown

### 1. `resources/js/pages/refereeController.setup.ts`

**Total callsites:** 50
**To silence:** 15
**Should notify:** 11

| Line | Function | Message | Tone | Importance | Action |
|------|----------|---------|------|------------|--------|
| 1578 | connectToAdmin | "Connecting..." | info | low | SILENCE |
| 1593 | connectToAdmin | "Connected as referee" | success | medium | SILENCE |
| 1598 | connectToAdmin catch | (sets displayErrorMessage) | - | - | ADD TOAST |
| 1607 | connectToAdmin | "WebSocket connected" | success | high | SILENCE |
| 1612 | connectToAdmin | "Disconnected" | error | high | SILENCE |
| 1615 | connectToAdmin | "Reconnecting..." | warning | high | SILENCE |
| 1627 | fetchMatches | "Matches loaded" | success | medium | SILENCE |
| 1634 | fetchMatches catch | (sets displayErrorMessage) | - | - | ADD TOAST |
| 1643 | fetchMatches | "Loading matches" | info | low | SILENCE |
| 1648 | fetchMatches | "Refreshing matches" | info | low | SILENCE |
| 1658 | handleSubmitResult | (validation error) | - | - | ADD TOAST |
| 1667 | handleSubmitResult catch | (sets displayErrorMessage) | - | - | ADD TOAST |
| 1708 | handleSubmitResult catch | (sets displayErrorMessage) | - | - | ADD TOAST |
| 1719 | handleSubmitResult | "Submitting result" | info | low | SILENCE |
| 1728 | handleSubmitResult | "Retrying submission" | info | low | SILENCE |
| 1762 | handleSubmitResult catch | (sets displayErrorMessage) | - | - | ADD TOAST |
| 1784 | handleSubmitResult | "Result submitted" | success | medium | SILENCE |
| 1793 | handleSubmitResult | "Result submitted successfully" | success | medium | SILENCE |
| 1821 | handleSubmitResult catch | (sets displayErrorMessage) | - | - | ADD TOAST |
| 1837 | handleSubmitResult | "Result submitted" (retry) | success | medium | SILENCE |
| 1855 | broadcastResultToScoreboard | "Broadcasting..." | info | low | SILENCE |
| 1873 | broadcastResultToScoreboard | "Broadcast to scoreboard" | success | medium | SILENCE |
| 1891 | broadcastResultToScoreboard catch | (swallowed) | - | - | ADD TOAST |
| 1898 | broadcastResultToScoreboard | "Retrying broadcast" | info | low | SILENCE |
| 1911 | broadcastResultToScoreboard | "Broadcast to scoreboard" | success | medium | SILENCE |
| 1941 | retryPendingResultSync | "Syncing pending results" | info | low | SILENCE |
| 1949 | retryPendingResultSync catch | (swallowed) | - | - | ADD TOAST |
| 1956 | retryPendingResultSync | "Retry sync completed" | success | medium | SILENCE |
| 2001 | loadLiveSnapshotRecovery | "Recovering snapshot" | info | low | SILENCE |

### 2. `resources/js/composables/useRefereeDisplayManagement.ts`

**Total callsites:** 35
**To silence:** 8
**Should notify:** 6

| Line | Function | Message | Tone | Importance | Action |
|------|----------|---------|------|------------|--------|
| 108 | launchScoreboard | "Launching scoreboard" | info | low | SILENCE |
| 129 | launchScoreboard | "Scoreboard launched" | success | medium | SILENCE |
| 136 | launchScoreboard catch | (swallowed) | - | - | ADD TOAST |
| 143 | launchScoreboard | "Scoreboard window blocked" | warning | medium | SILENCE |
| 189 | assignDisplayRole | "Assigning role" | info | low | SILENCE |
| 196 | assignDisplayRole catch | (swallowed) | - | - | ADD TOAST |
| 223 | assignDisplayRole | "Unassigning role" | info | low | SILENCE |
| 265 | assignDisplayRole | "Display role assigned" | success | medium | SILENCE |
| 272 | assignDisplayRole | (already assigned) | - | - | ADD TOAST |
| 308 | assignDisplayRole | (invalid role) | - | - | ADD TOAST |
| 345 | broadcastToScoreboard | "Broadcasting" | info | low | SILENCE |
| 378 | broadcastToScoreboard catch | (swallowed) | - | - | ADD TOAST |
| 387 | broadcastToScoreboard | "Broadcast sent" | success | medium | SILENCE |
| 412 | broadcastToScoreboard | "Broadcast failed" | error | medium | SILENCE |

### 3. `resources/js/composables/useRefereeQueueSync.ts`

**Total callsites:** 15
**To silence:** 8
**Should notify:** 5

| Line | Function | Message | Tone | Importance | Action |
|------|----------|---------|------|------------|--------|
| 212 | loadTournamentData | "Loading tournament" | info | low | SILENCE |
| 219 | loadTournamentData catch | (swallowed) | - | - | ADD TOAST |
| 234 | loadTournamentData | "Loading matches" | info | low | SILENCE |
| 267 | syncQueue | "Syncing queue" | info | low | SILENCE |
| 289 | syncQueue | "Queue synced" | success | medium | SILENCE |
| 295 | syncQueue | (queue empty) | - | - | ADD TOAST |
| 301 | checkOnlineStatus | "Checking connection" | info | low | SILENCE |
| 323 | checkOnlineStatus | "Connection restored" | success | low | SILENCE |
| 345 | checkOnlineStatus | "Online" | success | medium | SILENCE |
| 349 | checkOnlineStatus | "Offline" | error | medium | SILENCE |
| 356 | checkOnlineStatus catch | (swallowed) | - | - | ADD TOAST |
| 367 | loadLiveSnapshotRecovery | "Recovering" | info | low | SILENCE |
| 398 | loadLiveSnapshotRecovery catch | (swallowed) | - | - | ADD TOAST |

### 4. `resources/js/composables/useRefereeControllerSession.ts`

**Total callsites:** 14
**To silence:** 5
**Should notify:** 4

| Line | Function | Message | Tone | Importance | Action |
|------|----------|---------|------|------------|--------|
| 198 | pairDevice | "Pairing device" | info | low | SILENCE |
| 234 | pairDevice | "Device paired" | success | medium | SILENCE |
| 241 | pairDevice catch | (swallowed) | - | - | ADD TOAST |
| 258 | pairDevice | (invalid token) | - | - | ADD TOAST |
| 278 | pairDevice | "Pairing failed" | error | medium | SILENCE |
| 289 | pairDevice catch | (swallowed) | - | - | ADD TOAST |
| 312 | loadSnapshotRecovery | "Loading snapshot" | info | low | SILENCE |
| 319 | loadSnapshotRecovery catch | (swallowed) | - | - | ADD TOAST |

### 5. `resources/js/pages/refereeController/useRefereeControllerDisplayManagement.ts`

**Total callsites:** 5
**To silence:** 1
**Should notify:** 1

| Line | Function | Message | Tone | Importance | Action |
|------|----------|---------|------|------------|--------|
| 156 | broadcastRingMatchOrder catch | (swallowed) | - | - | ADD TOAST |

---

## Recommendations Summary

### Phase 4.4 — Implement `silenced: true` on these toast IDs:
- `connection.connected`, `connection.disconnected`, `connection.reconnecting` (status bar covers)
- `matches.loaded`, `result.submitted`, `result.submitted.success` (UI updates cover)
- `scoreboard.launched`, `scoreboard.broadcast`, `display.role.assigned` (visual confirmation covers)
- `queue.synced`, `device.paired`, `snapshot.recovered` (indicators cover)
- All loading/in-progress toasts (loading spinners cover)

### Phase 4.3 — Add toast calls in these locations:
- All `catch` blocks currently only setting `displayErrorMessage` (8 critical + 9 high)
- Silent validation error paths (3 medium)
- Swallowed errors in `useRefereeControllerDisplayManagement.ts` (1 medium)

### Next Steps
1. Update `feedbackRegistry.ts` with all 119 toast entries with correct `importance` and `silenced` flags
2. Add `showBanner()` calls to the 23 silent error locations
3. Set `silenced: true` on the 42 toasts identified for silencing
4. Test all error paths to verify toasts appear/disappear correctly
