# UI Trustworthiness Improvement Plan — Analysis Report

**Generated:** 2026-07-08
**Plan Version:** 1.0
**Status:** Planning Phase
**Analyst:** Production Stability Engineer

---

## Executive Summary

This report analyzes the feasibility, scope, and risks of the UI Trustworthiness Improvement Plan for the Kurash Tournament Suite (KTS). The plan targets **behavioral correctness** — ensuring every UI feedback element reflects verifiable system state rather than assumptions.

### Key Metrics

| Metric | Value |
|--------|-------|
| Toast Notification Call Sites | ~95+ |
| Status Indicator Categories | 37 |
| Modal Dialogs | 14 |
| Composables (State Management) | 19 |
| Broadcast Events | 9 |
| Source Files Requiring Audit | 15+ |

### Risk Assessment

| Risk Level | Count | Description |
|------------|-------|-------------|
| **CRITICAL** | 2 | Duplicate state sources, async race windows |
| **HIGH** | 4 | Stale fallback chains, missing warning tone, inconsistent feedback patterns |
| **MEDIUM** | 3 | Dynamic message sources, no centralized feedback registry |
| **LOW** | 2 | Missing feedback for silent operations, wording inconsistencies |

---

## 1. Codebase Architecture Analysis

### 1.1 Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│  Desktop: Electron 41 (portable .exe + NSIS installer)      │
│  ├── Embedded PHP + MariaDB runtime                         │
│  └── Multi-monitor display management                       │
├─────────────────────────────────────────────────────────────┤
│  Backend: PHP 8.2+ / Laravel 12                             │
│  ├── Inertia.js v2 (SPA without separate API)               │
│  ├── Laravel Reverb (WebSocket server)                      │
│  └── SQLite (portable/offline database)                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend: Vue 3.5 / TypeScript 5.x                         │
│  ├── Composition API (composable-centric state)              │
│  ├── shadcn-vue (New York v4) + Tailwind CSS v4             │
│  └── BroadcastChannel API (cross-window sync)               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 State Management Architecture

**Pattern:** Vue 3 Composition API with composables (no Redux/Pinia/Vuex)

**Persistence Layers:**
1. **localStorage** — Primary client-side persistence
2. **BroadcastChannel API** — Cross-tab/window synchronization
3. **Laravel Cache** — Server-side broadcast state (degraded fallback)
4. **SQLite** — Persistent match/tournament data
5. **Electron IPC** — Native persistence (desktop only)

**Real-time Communication:**
```
Referee Controller
    │
    ├──POST /broadcast/batch──► Laravel Backend
    │                               │
    │                               ▼
    │                        Laravel Reverb (WebSocket)
    │                               │
    │                               ▼
    └──BroadcastChannel──────► Scoreboard Display
         (in-process)              (Echo.channel)
```

### 1.3 Authoritative State Sources

| Domain | Owner Composable | Persistence | Update Mechanism |
|--------|------------------|-------------|------------------|
| Game State (score/timer) | `refereeController.setup.ts` | localStorage | Local Vue reactivity |
| Controller Auth/Pairing | `useRefereeControllerSession.ts` | Electron store / localStorage | HTTP POST to Admin Host |
| Queue/Match List | `useRefereeQueueSync.ts` | localStorage (scoped cache) | HTTP polling (~5s) |
| Display Management | `useRefereeDisplayManagement.ts` | Electron settings store | IPC to main process |
| Ring Match Order | `useRefereeRingMatchOrderSync.ts` | localStorage + BroadcastChannel | HTTP polling (~5s) |
| Scoreboard Snapshot | `useLocalScoreboardState.ts` | localStorage + BroadcastChannel | Local write on state change |

---

## 2. Phase-by-Phase Analysis

### Phase 1 — Inventory Existing Feedback

**Status:** Requires Significant Effort

**Findings:**

| Feedback Type | Count | Primary Locations |
|---------------|-------|-------------------|
| `showBanner()` calls | ~89 | `refereeController.setup.ts`, 4 composables |
| `showResultToast()` calls | 5 | `refereeController.setup.ts` |
| Status indicators | 37 categories | Template HTML, 10+ components |
| Modal dialogs | 14 | Setup TS, 3 Vue components |
| Native `alert()` | 1 | `Match.vue` |

**Concerns:**
- Toast calls are distributed across 5+ files with no centralized registry
- Dynamic message sources (`syncFallbackReasonLabel`, `getAutoLoadPausedReason`) generate messages at runtime
- No `warning` tone exists in the toast system (only `success | error | info`)

**Questions for Stakeholders:**
1. Should we create a centralized toast registry/type system before proceeding?
2. Is the missing `warning` tone intentional or an oversight?
3. Should the native `alert()` in `Match.vue` be converted to the custom toast system?

---

### Phase 2 — Identify the Authoritative Source

**Status:** Partially Clear

**Findings:**

Most indicators have clear ownership via composables, but some have ambiguous sources:

| Indicator | Owner | Ambiguity |
|-----------|-------|-----------|
| `ON GILAM` | `useRefereeQueueSync.ts` | Depends on `activeQueueSource` state |
| `Connected` | `useRefereeControllerSession.ts` | Multiple connection states exist |
| `Live Snapshot` | `useRefereeQueueSync.ts` | 4 different snapshot source modes |
| Display status | `useRefereeDisplayManagement.ts` | Electron-only (graceful degradation needed) |

**Concerns:**
- Queue state can come from 4 different sources (`queue_api`, `cached_queue`, `legacy_adapter`, `offline_cache`)
- The `syncFallbackReasonLabel` has 8+ different messages depending on degradation reason
- Display management is Electron-only but the app also runs in browsers

**Questions for Stakeholders:**
1. How should we handle indicators that are Electron-only vs browser-only?
2. Should the fallback reason labels be simplified for operator clarity?
3. Is there a preferred hierarchy when multiple state sources conflict?

---

### Phase 3 — Build a State Definition Matrix

**Status:** Feasible with Composable Architecture

**Findings:**

The composable architecture makes this phase straightforward — each composable has clear inputs/outputs. However, the matrix will be large:

- ~89 `showBanner()` calls need individual documentation
- 37 indicator categories need state definitions
- Dynamic message sources need runtime behavior documentation

**Concerns:**
- Some indicators have complex display conditions involving multiple state variables
- The `useRingDisplayQueue.ts` composable defines 5 display classes (`READY`, `PROVISIONAL`, `AUTO_ADVANCE`, `HIDDEN`, `COMPLETED`) that affect multiple indicators

**Questions for Stakeholders:**
1. Should we document the 85+ individual toast messages, or group them by category?
2. What level of detail is needed for edge case documentation?

---

### Phase 4 — Audit Toast Notifications

**Status:** High Effort Required

**Findings:**

**Toast Quality Distribution (Estimated):**

| Quality Level | Description | Estimate |
|---------------|-------------|----------|
| Excellent | Answers what/why/what changed | ~15% |
| Good | Clear but could be more specific | ~40% |
| Acceptable | Functional but vague | ~30% |
| Poor | Generic/unhelpful | ~15% |

**Examples of Poor Toasts:**
- `"Queue Updated"` — No context about what changed
- `"Sync refreshed."` — Doesn't say what was synced
- `"Failed to record match result."` — No guidance on recovery

**Examples of Good Toasts:**
- `"Manual Queue now owns the Active Scoreboard. Bout #103 is now ON GILAM."` — Clear ownership + state change
- `"Result was not accepted because this match changed on Event Host. The queue was refreshed. Please load the updated match before continuing."` — Explains cause + required action

**Concerns:**
- ~60+ error toasts may not provide actionable recovery guidance
- Some success toasts are overly verbose
- Timeout values vary (2000ms to 8500ms) without clear rationale

**Questions for Stakeholders:**
1. Should we standardize timeout values by toast type?
2. Should error toasts include a "retry" action or just information?
3. Is there a maximum acceptable length for toast messages?

---

### Phase 5 — Build a Trust Language

**Status:** Feasible

**Findings:**

The codebase already uses domain-specific terminology in many places:
- `"ON GILAM"`, `"Controller Ownership Transferred"`, `"Event Host Resumed"`
- `"Winner Submitted"`, `"Synchronization Completed"`

However, some messages use generic terms:
- `"Updated"`, `"Ready"`, `"Processing"`, `"Complete"`

**Concerns:**
- Dynamic message sources (`syncFallbackReasonLabel`) use technical jargon
- Some messages mix domain terms with technical terms

**Questions for Stakeholders:**
1. Should we create a glossary of approved domain terms?
2. How technical should fallback/degradation messages be?
3. Should we localize messages for different operator skill levels?

---

### Phase 6 — Verify Every Indicator

**Status:** High Risk — Requires Deep Analysis

**Findings:**

**Known Trust Issues:**

| Issue | Risk | Description |
|-------|------|-------------|
| Fallback chain state | HIGH | Queue can be from 4 different sources; operators may not know which |
| BroadcastChannel vs WebSocket race | HIGH | Scoreboard may briefly show stale state on load |
| Heartbeat vs queue poll timing | MEDIUM | Assignment changes detected up to 60s late |
| Local result override gap | MEDIUM | Local state diverges from Admin Host until next sync |
| Electron IPC async ordering | LOW | Rapid display changes may arrive out of order |

**Questions for Stakeholders:**
1. What is the acceptable staleness window for queue state?
2. Should we add visual indicators for state source (e.g., "Live" vs "Cached")?
3. Is the 60-second heartbeat interval acceptable for assignment detection?

---

### Phase 7 — Eliminate Duplicate Sources of Truth

**Status:** CRITICAL — Architectural Risk

**Findings:**

**Duplicate State Patterns Identified:**

```
Pattern 1: Queue State
├── Event Host API (authoritative)
├── Local cache (fallback)
├── Legacy adapter (legacy fallback)
└── Offline cache (last resort)
    → Risk: Operators may see stale data without knowing

Pattern 2: Scoreboard State
├── WebSocket (real-time)
├── BroadcastChannel (in-process)
└── localStorage (persistence)
    → Risk: Brief inconsistency on page load

Pattern 3: Display State
├── Electron IPC (authoritative)
└── UI state (derived)
    → Risk: Electron-only feature with browser fallback
```

**Questions for Stakeholders:**
1. Should we implement a state source indicator on all UI elements?
2. Is it acceptable to have fallback states, or should we fail loudly?
3. Should we add a "state freshness" indicator to critical elements?

---

### Phase 8 — Standardize Feedback Behavior

**Status:** Medium Effort

**Findings:**

**Inconsistencies Identified:**

| Event Type | Current Behavior | Standardized Should Be |
|------------|------------------|------------------------|
| Winner Submitted | Success toast + queue advancement | ✓ Consistent |
| Connection Lost | Error toast + badge update | Missing: explicit recovery guidance |
| Queue Changed | Info toast (sometimes) | Should always notify |
| Sync Completed | Success toast (sometimes) | Should always notify |

**Concerns:**
- Some operations produce toasts, others are silent
- No consistent pattern for "what happens next" messaging

**Questions for Stakeholders:**
1. Should every state-changing operation produce a toast?
2. Should we define a feedback matrix (event → toast type + message template)?
3. How do we handle operations that succeed silently?

---

### Phase 9 — Identify Missing Feedback

**Status:** Low Effort

**Findings:**

**Silent Operations That Should Notify:**

| Operation | Current Behavior | Recommended |
|-----------|------------------|-------------|
| Controller ownership change | Silent | Info toast |
| Sync completion | Sometimes silent | Success toast |
| Event Host takeover | Silent | Info toast |
| Manual Queue activation | Sometimes silent | Info toast |
| Queue completion | Silent | Info toast |
| Auto-queue progression | Silent | Info toast |

**Questions for Stakeholders:**
1. Which of these operations are critical enough to warrant notifications?
2. Should we add a "verbose mode" for debugging that shows all state changes?
3. How do we balance operator notification fatigue vs. visibility?

---

### Phase 10 — Produce Improvement Recommendations

**Status:** Depends on Phases 1-9

**Preliminary Categories:**

| Category | Estimated Items | Priority Distribution |
|----------|-----------------|----------------------|
| A (Trusted) | ~20% | No changes |
| B (Wording only) | ~30% | Low priority |
| C (Condition needs work) | ~35% | Medium priority |
| D (Architectural changes) | ~15% | High priority |

---

## 3. Risk Register

### CRITICAL Risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| C1 | Duplicate queue state sources | Operators see stale/wrong data | Implement state source indicator |
| C2 | BroadcastChannel/WebSocket race | Brief inconsistency on load | Add timestamp comparison + loading state |

### HIGH Risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| H1 | Missing `warning` toast tone | Cannot distinguish warnings from errors | Add `warning` tone to toast system |
| H2 | Fallback chain opacity | Operators don't know data source | Add "Data Source" indicator |
| H3 | ~60 error toasts lack recovery guidance | Operators don't know what to do | Audit and add recovery actions |
| H4 | No centralized feedback registry | Inconsistent implementation | Create toast/indicator registry |

### MEDIUM Risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| M1 | Dynamic message sources | Hard to audit/maintain | Centralize message generation |
| M2 | Heartbeat/queue poll timing gap | Delayed assignment detection | Reduce heartbeat interval or add event |
| M3 | Local result override divergence | Brief inconsistency with Admin Host | Add "pending sync" indicator |

### LOW Risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| L1 | Silent operations | Operators miss state changes | Add notifications for critical ops |
| L2 | Inconsistent timeout values | Unpredictable UX | Standardize by toast type |

---

## 4. Open Questions for Stakeholders

### Architecture Questions

1. **State Source Visibility:** Should all UI elements indicate their data source (live/cached/fallback)?
2. **Fallback Strategy:** Is it acceptable to show stale data, or should we fail loudly?
3. **Electron vs Browser:** How should Electron-only features degrade in browser mode?

### UX Questions

4. **Notification Fatigue:** How many toasts per minute is acceptable for operators?
5. **Toast Length:** What's the maximum acceptable character count for a toast message?
6. **Timeout Standards:** Should toast timeouts be standardized (e.g., success=2s, error=5s, info=3s)?

### Implementation Questions

7. **Centralized Registry:** Should we create a toast/indicator registry before starting Phase 1?
8. **Warning Tone:** Is the missing `warning` tone intentional or should we add it?
9. **Priority Order:** Which phase should we tackle first for maximum impact?

### Quality Questions

10. **Trust Threshold:** What percentage of indicators must be "Trusted" before we consider the project complete?
11. **Testing Strategy:** How do we validate that indicators are showing correct state?
12. **Monitoring:** Should we add runtime monitoring for indicator accuracy?

---

## 5. Recommended Approach

### Phase 0 (NEW) — Foundation Work

Before starting the 10 phases, I recommend:

1. **Create a centralized feedback registry** — A single source of truth for all toasts, indicators, and messages
2. **Add `warning` toast tone** — The system currently only supports `success | error | info`
3. **Define toast timeout standards** — Standardize by type (success, error, info, warning)

### Phase Ordering (Revised)

| Order | Phase | Rationale |
|-------|-------|-----------|
| 1 | Phase 1 (Inventory) | Foundation for all other work |
| 2 | Phase 2 (Authoritative Source) | Defines ownership |
| 3 | Phase 7 (Eliminate Duplicates) | CRITICAL risk mitigation |
| 4 | Phase 6 (Verify Indicators) | High risk mitigation |
| 5 | Phase 3 (State Matrix) | Documentation |
| 6 | Phase 4 (Audit Toasts) | Quality improvement |
| 7 | Phase 5 (Trust Language) | Consistency |
| 8 | Phase 8 (Standardize) | Consistency |
| 9 | Phase 9 (Missing Feedback) | Completeness |
| 10 | Phase 10 (Recommendations) | Final output |

### Estimated Effort

| Phase | Effort (Days) | Dependencies |
|-------|---------------|--------------|
| Phase 0 (Foundation) | 3-5 | None |
| Phase 1 (Inventory) | 5-7 | Phase 0 |
| Phase 2 (Authoritative Source) | 3-5 | Phase 1 |
| Phase 3 (State Matrix) | 5-7 | Phase 2 |
| Phase 4 (Audit Toasts) | 3-5 | Phase 1 |
| Phase 5 (Trust Language) | 2-3 | Phase 4 |
| Phase 6 (Verify Indicators) | 5-7 | Phase 2 |
| Phase 7 (Eliminate Duplicates) | 7-10 | Phase 2, Phase 6 |
| Phase 8 (Standardize) | 3-5 | Phase 4, Phase 5 |
| Phase 9 (Missing Feedback) | 2-3 | Phase 1 |
| Phase 10 (Recommendations) | 3-5 | All phases |
| **Total** | **41-62 days** | — |

---

## 6. Success Criteria Validation

The plan defines these success criteria:

| Criterion | Validation Method | Current Status |
|-----------|-------------------|----------------|
| Every feedback element has one authoritative source | Phase 2 audit | Partially met |
| Every status indicator has a deterministic display condition | Phase 3 matrix | Not yet assessed |
| Every toast clearly communicates what changed | Phase 4 audit | ~55% meet standard |
| No UI element can display misleading information | Phase 6 verification | Known issues exist |
| Operators can trust what the application communicates | Operator feedback survey | Not yet assessed |

---

## 7. Next Steps

1. **Respond to open questions** (Section 4) to clarify requirements
2. **Approve Phase 0** foundation work (centralized registry, warning tone, timeout standards)
3. **Begin Phase 1** inventory with the feedback registry as input
4. **Schedule weekly check-ins** to review progress and adjust priorities

---

## Appendix A: File Reference

### Toast Notification Sources

| File | Line Count | Toast Calls |
|------|------------|-------------|
| `refereeController.setup.ts` | 8,495 | 46 |
| `useRefereeQueueSync.ts` | 1,821 | 13 |
| `useRefereeControllerSession.ts` | ~750 | 12 |
| `useRefereeDisplayManagement.ts` | ~1,100 | 37 |
| `useRefereeControllerDisplayManagement.ts` | ~550 | 2 |
| `Match.vue` | ~350 | 1 (native alert) |

### Status Indicator Sources

| File | Component | Indicator Count |
|------|-----------|-----------------|
| `refereeController.template.html` | Queue status | 5 categories |
| `RefereeConnectionPanel.vue` | Connection state | 4 categories |
| `RefereeDisplayManagementPanel.vue` | Display state | 6 categories |
| `RefereeFallbackRecoveryPanel.vue` | Recovery state | 5 categories |
| `ringMatchOrder.vue` | Ring order state | 3 categories |
| `kurashScoreBoard.vue` | Scoreboard state | 2 categories |

### Modal Dialog Sources

| File | Dialog Count |
|------|--------------|
| `refereeController.setup.ts` + template | 10 |
| `KeyboardSettings.vue` | 2 |
| `TwoFactorSetupModal.vue` | 1 |
| `DeleteUser.vue` | 1 |

---

**Report Status:** Ready for Stakeholder Review
**Next Action:** Await responses to open questions before proceeding to implementation
