# UI Trustworthiness Investigation — Phase 2 Report

**Generated:** 2026-07-08
**Investigation Scope:** Intended Audience, Information Quality, Notification Importance, State Source Visibility
**Status:** Investigation Phase — No Implementation Approved

---

## Purpose

This report expands the investigation per the verdict dated 2026-07-08. It documents observations, evidence-supported risks, open questions, and candidate improvements. **No solutions are proposed or approved in this report.**

---

## Table of Contents

1. [Confirmed Observations](#1-confirmed-observations)
2. [Risks Supported by Evidence](#2-risks-supported-by-evidence)
3. [Open Questions](#3-open-questions)
4. [Candidate Improvements](#4-candidate-improvements)
5. [Implementation Recommendations Requiring Stakeholder Approval](#5-implementation-recommendations-requiring-stakeholder-approval)

---

# 1. Confirmed Observations

## 1.1 Toast Notification Inventory

| Metric | Value |
|--------|-------|
| Total distinct toast call sites | ~95+ |
| `showBanner()` calls | ~89 |
| `showResultToast()` calls | 5 |
| Native `alert()` calls | 1 |
| Files containing toast calls | 6 |
| Custom toast system (no third-party library) | Yes |
| Toast tones supported | `success`, `error`, `info` (no `warning`) |
| Maximum concurrent toasts | 2 |

**Source files:**

| File | Approximate Toast Calls |
|------|------------------------|
| `refereeController.setup.ts` | 46 |
| `useRefereeQueueSync.ts` | 13 |
| `useRefereeControllerSession.ts` | 12 |
| `useRefereeDisplayManagement.ts` | 37 |
| `useRefereeControllerDisplayManagement.ts` | 2 |
| `Match.vue` | 1 (native `alert()`) |

---

## 1.2 Status Indicator Inventory

| Category | Count |
|----------|-------|
| Distinct indicator categories | 37 |
| Queue status indicators | 5 (ON GILAM, NEXT, QUEUED, ON HOLD, DONE) |
| Connection state badges | 8 (Event Host needed, Reconnecting, Connected, etc.) |
| Queue freshness badges | 8 (Live Snapshot, Cached Snapshot, etc.) |
| Display management indicators | 12+ (session states, per-display roles) |
| Ring match order indicators | 9 (Live, Waiting, Preview, etc.) |
| Diagnostic labels | 15+ (Technical diagnostics section) |

---

## 1.3 Modal Dialog Inventory

| Category | Count |
|----------|-------|
| Referee controller dialogs | 10 |
| Settings/account dialogs | 3 |
| Alert/notification components | 2 |
| **Total** | **15** |

---

## 1.4 Intended Audience Analysis

### Audience Categories Identified

| Audience | Role Description |
|----------|------------------|
| Referee | Uses the referee controller to manage matches, submit results |
| Event Host operator | Manages the tournament, assigns controllers, monitors queue |
| Tournament administrator | Configures tournaments, manages settings |
| Technical operator | Debugs connection issues, display problems |
| Spectator | Views scoreboard displays |
| Ring display only | Gilam Match Order screens |

### Toast Audience Distribution

| Audience Category | Count | Percentage |
|-------------------|-------|------------|
| Clearly Referee | ~11 | 24% |
| Clearly Event Host / Admin | ~12 | 26% |
| Technical Operator (shown to referee) | ~7 | 15% |
| Ambiguous / Mixed Audience | ~15 | 33% |
| **Total distinct patterns** | **~46** | **100%** |

### Audience Mismatch Patterns Identified

**Pattern A: Technical jargon leaks into referee-facing toasts**

| Location | Message | Issue |
|----------|---------|-------|
| `refereeController.setup.ts:4803` | `"${contextLabel}: ${message} (HTTP ${status})"` | Raw HTTP status codes shown to referee |
| `refereeController.setup.ts:7950` | `"Result was not recorded... (trace: ${remoteResultTraceId})"` | Trace ID shown to referee |
| `useRefereeQueueSync.ts:866` | `"Saving match list to local DB..."` | "local DB" is implementation detail |
| `useRefereeQueueSync.ts:869` | `"Saved match list to kurash_db"` | Literal database name exposed |
| `useRefereeQueueSync.ts:1777` | `"Sync: ${message}."` | Raw API error text passed through |

**Pattern B: Dual-audience messages (Referee + Event Host mixed)**

| Location | Message | Issue |
|----------|---------|-------|
| `refereeController.setup.ts:7877` | `"Result saved locally. Event Host sync will run in the background..."` | Referee needs "result saved"; sync detail is for Event Host |
| `refereeController.setup.ts:7924` | `"Result saved locally. Match X will sync to Admin when the Event Host reconnects."` | "sync to Admin" is not meaningful to referee |
| `refereeController.setup.ts:4733` | `"Pending Admin result sync is still waiting: ${message}"` | "Admin result sync" is internal terminology |
| `refereeController.setup.ts:6355` | `"Live queue changed. Current match stays loaded; Admin next match is ${label}."` | "Admin next match" mixes queue terminology |

**Pattern C: Platform guard shown as user error**

| Location | Message | Issue |
|----------|---------|-------|
| `useRefereeDisplayManagement.ts` (15+ locations) | `"Display controls are only available in the Electron desktop app."` | Repeated 15+ times; not meaningful to referees |

---

## 1.5 Information Quality Analysis

### Quality Distribution

| Category | Count | Percentage | Description |
|----------|-------|------------|-------------|
| Actionable | 28 | 43% | Tells operator exactly what to do next |
| Informational | 20 | 31% | Confirms success or provides context |
| Diagnostic | 13 | 20% | Technical details useful for debugging |
| Potentially Confusing | 7 | 5% | Jargon or vague wording |
| Internal/Technical | 2 | 3% | Raw error text or internal state |

### Strengths Observed

- **Three-part error pattern**: Many errors follow what happened → why → what to do next
  - Example: `"Result was not accepted because this match changed on Event Host. The queue was refreshed. Please load the updated match before continuing."`
- **Pairing reset reasons**: Well-documented reasons explaining why pairings were cleared
- **Offline degradation messages**: Clear fallback messaging when connectivity drops

### Weaknesses Observed

- **"Sync" is overloaded**: Used in 10+ messages with different meanings (save, refresh, reconnect, snapshot recovery)
- **Raw error leaks**: Some `catch` blocks show `error.message` directly to operators
- **Jargon in operator messages**: Terms like "Gilam" (ring), "Event Host" (admin server), "queue" (match list) may confuse non-technical users
- **Generic display errors**: Many display-related errors share the same vague message with no actionable guidance

---

## 1.6 Notification Importance Classification

### HIGH Importance — Requires Immediate Operator Attention

| ID | Event | Justification |
|----|-------|---------------|
| H1 | Match result submission failure | Directly threatens match integrity |
| H2 | Rollback sequence conflict (result rejection) | Event Host rejected result; queue was refreshed |
| H3 | Controller pairing failure | No live queue data, no result sync, no assignment |
| H4 | Session credentials invalidated | Controller cannot authenticate |
| H5 | Authoritative match change forces clear | Loaded match was forcefully cleared |
| H6 | Winner toggle without loaded match | Would create orphaned result |
| H7 | Load match ring mismatch | Would result in incorrect scoring |
| H8 | Blocked pending results needing manual review | Data loss risk |
| H9 | Connection lost during active operations | Critical workflow interruption |
| H10 | Live snapshot recovery failure | Controller remains on stale data |
| H11 | Scoreboard data fetch failure | Blocks entire workflow |
| H12 | Submit gate / rollback guard failure | Result integrity depends on these |

### MEDIUM Importance — Useful Awareness, Not Urgent

| ID | Event | Justification |
|----|-------|---------------|
| M1 | Connection status changes (online/offline) | Important awareness, offline fallback exists |
| M2 | Known device reconnected | Reassurance after disconnection |
| M3 | Live queue refreshed / sync refreshed | Confirmation of successful operation |
| M4 | Live snapshot restored | Recovery from degraded state |
| M5 | Result saved locally (queued for sync) | Pending sync state, system retries automatically |
| M6 | Event Host changed match (queue-level) | Queue-level awareness, not actively loaded |
| M7 | Cleared stale loaded match (ring mismatch) | System handled automatically |
| M8 | Controller paired successfully | Positive confirmation |
| M9 | Connection test success | Operator-initiated confirmation |
| M10 | Tournaments refreshed | Operator-triggered success |
| M11 | Match ended successfully (result recorded) | Critical success confirmation |
| M12 | Controller assignment blocking error | Important but can wait |
| M13 | Fallback reason notifications | System functioning on fallback |
| M14 | Pending result sync still waiting | System will retry |
| M15 | Display state status notice | Live broadcast awareness |
| M16 | Invalid player name validation | Prevents invalid data entry |
| M17 | Online/offline recovery prompt | Important guidance |

### LOW Importance — Nice-to-Know, Can Remain Silent

| ID | Event | Justification |
|----|-------|---------------|
| L1 | Saving/saved match list to local DB | Background operation, routine |
| L2 | Connection refreshed (no tournament selected) | Operator already knows they refreshed |
| L3 | Auto-detected API base | Operator did not trigger this |
| L4 | Setup link loaded | Redundant with visual state |
| L5 | Auto-load paused reason | Background behavior, fires during queue updates |
| L6 | Local pairing cleared | UI state change is sufficient feedback |
| L7 | Club branding info | Informational about deprecated feature |
| L8 | Can't load match (players must be set) | Redundant with disabled button state |
| L9 | Pending results synced count | Background count not operator-relevant |
| L10 | Connection test failure | Operator-initiated, already has context |
| L11 | Invalid event host address (blur validation) | Should be inline validation, not toast |
| L12 | Invalid setup link address | Connection panel already shows state |
| L13 | Display action validation errors (~30) | Button already visually disabled |
| L14 | Fetch failure reports (HTTP codes) | Developer-oriented |
| L15 | Queue change conflict (info) | Informational, no action needed |
| L16 | Offline continuation info | Persistent indicator more appropriate than toast |
| L17 | Submit gate assessment info | Finish button already disabled |

### Currently Silent but Should Notify

| ID | Event | Current Behavior | Why It Should Notify |
|----|-------|------------------|---------------------|
| S1 | Timer reaching zero / match time expired | Buzzer sound only | Operators with muted audio get no visual cue |
| S2 | Jazo auto-activation at halftime | Timer stops, no explanation | Operator needs to understand why timer stopped |
| S3 | Display screen disconnected during live broadcast | Status tracked in state | Operator may not be watching the panel |
| S4 | Broadcast session state change to `partially_degraded` | State tracked, no alert | Live screens partially lost |
| S5 | Manual Queue item auto-advanced | No notification | Operator should know which match is now active |

---

## 1.7 State Source Visibility Analysis

### Current State Source Labels

| Internal Code | Operator Label (Freshness) | Operator Label (Mode) | Assessment |
|---------------|---------------------------|----------------------|------------|
| `queue_api` | Live Snapshot | Live snapshot | GOOD |
| `cached_queue` | Cached Snapshot | Cached snapshot | ACCEPTABLE — "cached" is borderline technical |
| `offline_cache` | Offline Snapshot | Offline snapshot fallback | GOOD |
| `legacy_adapter` | Legacy Snapshot Fallback | Compatibility fallback | PROBLEMATIC — "Legacy" and "Compatibility" are implementation concepts |

### Internal Name Leaks Identified

| Location | Leak | Assessment |
|----------|------|------------|
| `template.html:975-978` | `queueDegradedReason` raw value in tooltip (`controller_assignment_unavailable`, `controller_assigned_queue_failed`) | PROBLEMATIC — internal codes shown as hover tooltip |
| `useRefereeControllerSyncPanels.ts:452` | `Legacy Snapshot Fallback` freshness label | PROBLEMATIC — "Legacy" is implementation concept |
| `useRefereeControllerSyncPanels.ts:395` | `Compatibility fallback` mode label | PROBLEMATIC — "Compatibility" implies backward-compatibility |
| `useRefereeControllerSyncPanels.ts:372` | `Offline snapshot cache` source label | BORDERLINE — "Cache" is technical |
| `useRefereeQueueSync.ts:869` | `Saved match list to kurash_db` banner | PROBLEMATIC — internal database name exposed |
| `template.html:1015` | `Upstream Gen` diagnostics label | BORDERLINE — "Upstream" is architecture term |

### What Operators Actually Need to Know

Operators running a tournament need to answer three questions:

1. **Is my data current?** — "Live" vs. "Saved/Offline" is sufficient
2. **Can I trust what I see?** — "Trustworthy" / "May be stale" / "Offline, using last saved data"
3. **What should I do?** — "Reconnect" / "Refresh" / "Wait" / "Nothing needed"

The current system does well on #3 (action-oriented recovery banners) and reasonably on #1 (Live/Saved/Offline). It has leaks on #2 where internal naming adds noise rather than clarity.

---

# 2. Risks Supported by Evidence

## 2.1 Confirmed Risks

### Risk 1: Technical Jargon Leaks to Non-Technical Operators

**Evidence:**
- HTTP status codes shown in toasts (`(HTTP ${status})`)
- Trace IDs shown to referees (`(trace: ${remoteResultTraceId})`)
- Database names shown (`kurash_db`)
- "Admin result sync" terminology in referee-facing messages
- "Legacy Snapshot Fallback" label uses implementation term

**Impact:** Operators may not understand error messages, leading to confusion or inappropriate actions.

**Affected locations:** 7+ distinct toast patterns, 3 indicator labels

---

### Risk 2: Dual-Audience Messages Reduce Clarity

**Evidence:**
- Messages about result saving mix referee needs ("result saved") with Event Host details ("sync to Admin")
- "Pending Admin result sync is still waiting" uses internal synchronization terminology
- "Admin next match is X" mixes queue terminology

**Impact:** Messages try to serve two audiences and may confuse both.

**Affected locations:** 5+ distinct toast patterns

---

### Risk 3: Notification Fatigue from Low-Importance Toasts

**Evidence:**
- ~17 LOW importance events generate toasts
- "Saving match list to local DB..." and "Saved match list to kurash_db" are 2 toasts for routine background operation
- Auto-load paused reason fires during every queue update cycle
- ~30 display action validation errors shown as toasts when buttons are already visually disabled
- "Display controls are only available in the Electron desktop app" repeated 15+ times

**Impact:** Operators may start ignoring toasts, missing important notifications.

**Affected locations:** 17+ LOW importance toast patterns

---

### Risk 4: Critical Events Without Adequate Visual Feedback

**Evidence:**
- Timer reaching zero only has buzzer sound, no visual toast
- Jazo auto-activation at halftime stops timer with no explanation
- Display screen disconnection during live broadcast tracked in state but no alert
- Broadcast `partially_degraded` state tracked but no operator alert
- Manual queue auto-advance has no notification

**Impact:** Operators may miss critical state changes, especially with muted audio.

**Affected locations:** 5 silent-but-should-notify events

---

### Risk 5: Overloaded "Sync" Terminology

**Evidence:**
- "Sync" used in 10+ messages with different meanings:
  - "Sync refreshed" (queue refresh)
  - "Sync: ${message}" (error prefix)
  - "Admin result sync" (result synchronization)
  - "Event Host sync will run in the background" (background process)
  - "Live snapshot restored" (recovery)
- Each usage implies a different operation but uses the same word

**Impact:** Operators cannot reliably understand what "sync" means in context.

**Affected locations:** 10+ toast patterns

---

### Risk 6: Raw Error Text Passes Through to Operators

**Evidence:**
- `error?.message` shown directly in multiple catch blocks
- `e?.message || "Connection test failed."` pattern shows raw API errors
- API error responses passed through without sanitization

**Impact:** Technical error messages (network errors, JSON parse failures, etc.) shown to non-technical operators.

**Affected locations:** 10+ error toast patterns

---

### Risk 7: Inconsistent Visual Treatment for Same State

**Evidence:**
- `cached_queue` gets yellow (warning) visual treatment
- `legacy_adapter` gets gray (neutral) visual treatment
- Both represent "not live" data from operator perspective
- Different colors may imply different trust levels when the actual difference is implementation detail

**Impact:** Operators may misinterpret the reliability of data based on color coding.

**Affected locations:** `queueFreshnessToneClass` in `useRefereeControllerSyncPanels.ts`

---

## 2.2 Potential Risks (Require Further Investigation)

### Potential Risk A: Queue State Source Confusion

**Observation:** Queue data can come from 4 different sources (`queue_api`, `cached_queue`, `legacy_adapter`, `offline_cache`). The `syncFallbackReasonLabel` messages are generally good, but the raw `queueDegradedReason` code leaks through tooltips.

**Question:** Do operators understand the difference between "Live Snapshot" and "Cached Snapshot"? Is this distinction meaningful to them?

**Investigation needed:** Operator feedback or usability testing.

---

### Potential Risk B: Toast Timeout Inconsistency

**Observation:** Toast timeouts range from 2000ms to 8500ms without clear rationale. Some critical errors have shorter timeouts than some informational messages.

**Question:** Do operators have enough time to read and understand critical error messages?

**Investigation needed:** Timeout audit across all toast types.

---

### Potential Risk C: Missing Warning Tone

**Observation:** The toast system only supports `success | error | info`. There is no `warning` tone. Some messages that should be warnings use `info` or `error` instead.

**Question:** Would a `warning` tone improve operator understanding of situations that are not errors but require attention?

**Investigation needed:** Audit of messages that would benefit from a warning tone.

---

# 3. Open Questions

## 3.1 Audience Questions

1. **Q:** What percentage of referee controller users are technical operators vs. non-technical referees?
   - **Why it matters:** Determines how much technical detail is appropriate in messages.

2. **Q:** Should the "Display controls are only available in the Electron desktop app" message be shown to users, or should the UI gracefully degrade without a toast?
   - **Why it matters:** This message appears 15+ times and is not meaningful to most operators.

3. **Q:** Is there a scenario where a referee needs to see HTTP status codes or trace IDs?
   - **Why it matters:** Determines whether these should be removed or moved to a diagnostics panel.

## 3.2 Information Quality Questions

4. **Q:** Should error toasts always include a recovery action, or is it acceptable to just describe the problem?
   - **Why it matters:** Affects message length and complexity.

5. **Q:** Is the "three-part error pattern" (what happened → why → what to do) the preferred format for all error messages?
   - **Why it matters:** Establishes a consistent messaging standard.

6. **Q:** Should "Sync" be replaced with more specific verbs (save, refresh, reconnect, recover)?
   - **Why it matters:** Affects clarity but may increase message length.

## 3.3 Notification Importance Questions

7. **Q:** Is the current notification frequency acceptable, or should LOW importance events be silenced?
   - **Why it matters:** Affects operator notification fatigue.

8. **Q:** Should timer expiration (buzzer) also produce a visual toast for operators with muted audio?
   - **Why it matters:** Affects match timing awareness.

9. **Q:** Should display screen disconnection during live broadcast produce a toast?
   - **Why it matters:** Affects live broadcast reliability.

10. **Q:** Should manual queue auto-advance produce a notification?
    - **Why it matters:** Affects operator awareness of queue progression.

## 3.4 State Source Visibility Questions

11. **Q:** Do operators need to know the difference between "Cached Snapshot" and "Offline Snapshot"?
    - **Why it matters:** Determines whether these should be unified into a single "Saved Data" label.

12. **Q:** Is "Legacy Snapshot Fallback" a meaningful label to operators, or should it be "Local Snapshot" or "Offline Copy"?
    - **Why it matters:** Affects operator understanding of data trustworthiness.

13. **Q:** Should the `queueDegradedReason` raw code be exposed in tooltips, or should it be translated to operator-friendly text?
    - **Why it matters:** Directly affects operator experience when hovering over the Degraded badge.

## 3.5 Architecture Questions

14. **Q:** Should the toast system be centralized before proceeding with message improvements?
    - **Why it matters:** Centralization may make improvements easier but adds upfront work.

15. **Q:** Should there be a distinction between `showBanner` (status bar) and `showResultToast` (popup) based on audience or importance?
    - **Why it matters:** Could help operators distinguish critical vs. informational messages.

---

# 4. Candidate Improvements

**Note:** These are observations of potential improvements, not approved changes. Each requires stakeholder evaluation.

## 4.1 Audience-Appropriate Messaging

**Observation:** ~7 toast patterns show technical details (HTTP codes, trace IDs, database names) to non-technical operators.

**Candidate consideration:** Move technical details to a diagnostics panel or log, show operator-friendly messages in toasts.

**Evidence:** HTTP status codes like "(HTTP 409)" are not meaningful to referees. Trace IDs like "(trace: abc123)" are only useful for support tickets.

**Alternative:** Keep technical details available but behind an expandable "Details" section in the toast or in the Support Details panel.

**Complexity:** Low — mostly message text changes.

---

## 4.2 Resolved Dual-Audience Messages

**Observation:** ~5 toast patterns mix referee needs with Event Host/technical details.

**Candidate consideration:** Separate messages by audience: show referee-actionable content in the toast, make sync details available in diagnostics.

**Evidence:** "Result saved locally. Event Host sync will run in the background..." tries to serve both audiences.

**Alternative:** Show "Result saved." to referee. Show sync details in the connection status panel.

**Complexity:** Low — message text separation.

---

## 4.3 Reduced Notification Frequency

**Observation:** ~17 LOW importance events generate toasts that contribute to notification fatigue.

**Candidate consideration:** Silence or reduce prominence of LOW importance events.

**Evidence:** "Saving match list to local DB..." and "Saved match list to kurash_db" are 2 toasts for a routine background operation. Display action validation errors appear when buttons are already visually disabled.

**Alternative:** Remove toasts for events where the UI state change is sufficient feedback. Use status indicators instead of toasts for ongoing states.

**Complexity:** Medium — requires evaluating each LOW importance event individually.

---

## 4.4 Critical Event Notifications

**Observation:** 5 events that should notify operators are currently silent.

**Candidate consideration:** Add notifications for timer expiration, Jazo activation, display disconnection, broadcast degradation, and queue auto-advance.

**Evidence:** Timer expiration only has a buzzer sound. Display disconnection during live broadcast is tracked but not alerted. Manual queue auto-advance happens silently.

**Alternative:** Add brief toasts or persistent indicators for these events.

**Complexity:** Low-Medium — adding new toast calls for existing state changes.

---

## 4.5 Operator-Focused State Labels

**Observation:** Some state source labels use implementation terminology ("Legacy", "Compatibility", "Cache").

**Candidate consideration:** Replace implementation-focused labels with operator-focused labels.

**Evidence:** "Legacy Snapshot Fallback" uses "Legacy" which is an implementation concept. Operators need to know "is my data current?" not "what code path was used?"

**Alternative:** Use labels like "Local Snapshot", "Offline Copy", "Saved Data" instead.

**Complexity:** Low — label text changes only.

---

## 4.6 Degraded Badge Tooltip Translation

**Observation:** The `queueDegradedReason` raw code (`controller_assignment_unavailable`, `controller_assigned_queue_failed`) is shown as a tooltip on the Degraded badge.

**Candidate consideration:** Translate raw codes to operator-friendly tooltip text.

**Evidence:** Raw enum values like `controller_assignment_unavailable` are meaningless to operators.

**Alternative:** Map each reason code to a human-readable tooltip message.

**Complexity:** Low — tooltip text mapping.

---

## 4.7 Consistent Visual Treatment

**Observation:** `cached_queue` and `legacy_adapter` get different colors despite both representing "not live" data.

**Candidate consideration:** Use consistent visual treatment for all "not live" states.

**Evidence:** Yellow (warning) for `cached_queue` vs. gray (neutral) for `legacy_adapter` may imply different trust levels when the actual difference is implementation detail.

**Alternative:** Use a consistent color for all "saved/offline" states.

**Complexity:** Low — CSS class changes.

---

## 4.8 Sanitized Error Messages

**Observation:** `error?.message` is shown directly in multiple catch blocks, passing through raw API or network errors.

**Candidate consideration:** Sanitize error messages before showing to operators.

**Evidence:** Raw error text like "Failed to fetch" or "Unexpected token < in JSON" is not meaningful to operators.

**Alternative:** Map common error types to operator-friendly messages. Keep raw errors in diagnostics.

**Complexity:** Medium — requires error categorization and message mapping.

---

# 5. Implementation Recommendations Requiring Stakeholder Approval

**Note:** No implementation has been approved. The following are recommendations that require explicit stakeholder decision before any work begins.

## 5.1 Investigation Completion Criteria

Before proceeding to implementation planning, the following should be confirmed:

| Criterion | Status | Required Action |
|-----------|--------|-----------------|
| All toast notifications documented | Complete | None |
| All status indicators documented | Complete | None |
| Intended audience identified for each message | Complete | Review findings |
| Information quality assessed for each message | Complete | Review findings |
| Importance level classified for each event | Complete | Review findings |
| State source visibility evaluated | Complete | Review findings |
| Open questions answered | Pending | Stakeholder responses needed |

## 5.2 Recommended Next Steps (Pending Approval)

| Step | Description | Depends On |
|------|-------------|------------|
| 1 | Stakeholder review of this report | Report delivery |
| 2 | Answer open questions (Section 3) | Stakeholder input |
| 3 | Prioritize candidate improvements (Section 4) | Open question answers |
| 4 | Create State Definition Matrix (Plan Phase 3) | Prioritization |
| 5 | Produce final Trustworthiness Assessment | State Definition Matrix |

## 5.3 What Has NOT Been Approved

Per the verdict, the following are **NOT approved** and should not be implemented:

- Centralized feedback registries
- New toast systems or warning toast types
- State source indicators
- New UI components
- New abstractions
- Any architecture changes

These may be good ideas but should only be proposed after the investigation is complete and supported by evidence.

---

# Appendix A: File Reference

## Toast Notification Files

| File | Purpose | Toast Calls |
|------|---------|-------------|
| `resources/js/pages/refereeController.setup.ts` | Main controller setup | 46 |
| `resources/js/composables/useRefereeQueueSync.ts` | Queue synchronization | 13 |
| `resources/js/composables/useRefereeControllerSession.ts` | Controller pairing/session | 12 |
| `resources/js/composables/useRefereeDisplayManagement.ts` | Electron display management | 37 |
| `resources/js/pages/refereeController/useRefereeControllerDisplayManagement.ts` | Display management wrapper | 2 |
| `resources/js/pages/Match.vue` | Legacy match page | 1 |

## Status Indicator Files

| File | Purpose |
|------|---------|
| `resources/js/pages/refereeController.template.html` | Main template with indicators |
| `resources/js/components/Referee/RefereeConnectionPanel.vue` | Connection status |
| `resources/js/components/Referee/RefereeDisplayManagementPanel.vue` | Display management |
| `resources/js/components/Referee/RefereeFallbackRecoveryPanel.vue` | Fallback/recovery |
| `resources/js/pages/ringMatchOrder.vue` | Ring match order display |
| `resources/js/pages/kurashScoreBoard.vue` | Scoreboard display |

## State Management Files

| File | Purpose |
|------|---------|
| `resources/js/composables/useRefereeControllerSession.ts` | Auth/pairing state |
| `resources/js/composables/useRefereeQueueSync.ts` | Queue state |
| `resources/js/composables/useRefereeDisplayManagement.ts` | Display state |
| `resources/js/composables/useRingDisplayQueue.ts` | Queue normalization |
| `resources/js/composables/refereeQueueOverrides.ts` | Local result overrides |
| `resources/js/composables/useRefereeControllerSyncPanels.ts` | Sync panel labels |

---

**Report Status:** Ready for Stakeholder Review
**Next Action:** Await responses to open questions before proceeding
