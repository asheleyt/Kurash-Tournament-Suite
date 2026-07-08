---
name: UI-Trustworthiness-Improvement-Plan
description: Architectural proposal for improving the trustworthiness, accuracy, and consistency of toast notifications, status indicators, and operator feedback throughout the KTS application.
version: 1.0
priority: High
status: Planning
---

# UI Trustworthiness Improvement Plan

## Objective

Improve every toast notification, status indicator, badge, and informational label so that operators can fully trust what the application is communicating.

This project is **not** primarily a UI redesign.

It is a **behavioral correctness** initiative.

The goal is to ensure that every piece of feedback shown to the user represents a verifiable system state rather than an assumption, prediction, or approximation.

---

# Philosophy

The UI should never guess.

The UI should never predict.

The UI should never interpret.

The UI should only reflect authoritative application state.

An operator should always be able to ask:

> "Why does it say this?"

…and there should be one deterministic answer in the code.

---

# Core Design Principle

Every UI feedback element must have:

- a single authoritative source
- one deterministic display condition
- one clear purpose
- one documented meaning

No indicator should exist solely because "it feels right."

It must exist because the application can prove it.

---

# Phase 1 — Inventory Existing Feedback

## Objective

Create a complete inventory of every feedback element currently shown throughout the application.

Include, but do not limit to:

### Toast Notifications

Examples:

- Success
- Error
- Warning
- Information
- Queue updates
- Winner submission
- Connection status
- Synchronization events

---

### Status Indicators

Examples:

- ON GILAM
- NEXT
- QUEUED
- ON HOLD
- Connected
- Disconnected
- Active
- Ready
- Waiting

---

### Labels

Examples:

- Manual Queue Active
- Event Host Connected
- Controller Status
- Synchronization Status
- Tournament Status
- Timer Status

---

### Badges

Examples:

- Match Status
- Queue Ownership
- Weight Class
- Round Information

---

### Modal Messages

Examples:

- Confirmation dialogs
- Warning dialogs
- Reset confirmations

---

# Deliverable

Produce a complete catalog containing:

- UI element
- Location
- Current wording
- Trigger condition
- Source code location

---

# Phase 2 — Identify the Authoritative Source

For every feedback element determine:

## Which subsystem owns this information?

Possible owners include:

- Active Scoreboard Controller
- Manual Queue
- Event Host
- Tournament Manager
- Timer
- Referee Controller
- Local Gilam
- Synchronization Service
- Connection Manager

Each UI element must have exactly one authoritative owner.

---

# Example

## ON GILAM

Purpose

Identifies the bout currently projected by the Active Scoreboard Controller.

Authoritative Source

Active Scoreboard Controller

Display Condition

Queue item's Match ID equals the Match ID currently loaded by the Active Scoreboard Controller.

Hide When

- another bout is active
- another queue owns the controller
- controller is idle

Reason

This indicator tells operators exactly which bout is currently projected to referees, athletes, and spectators.

---

# Phase 3 — Build a State Definition Matrix

Create documentation for every feedback element.

Recommended format:

```
UI Element

Purpose

Authoritative Source

Display Condition

Hide Condition

Why It Exists

Possible Edge Cases
```

---

## Example

```
UI Element:
NEXT

Purpose:
Identifies the next bout that will become active within the currently active queue.

Authoritative Source:
Active Queue Manager

Display Condition:
Queue Position == 2

Hide Condition:
Queue contains fewer than two items.

Edge Cases:
Manual Queue ownership changes.
Queue removal.
Queue insertion.
```

---

Repeat this for every indicator.

---

# Phase 4 — Audit Toast Notifications

Current toast notifications should be evaluated.

Determine whether each toast answers:

- What happened?
- Why did it happen?
- What changed?

---

## Poor Example

```
Queue Updated
```

This provides almost no useful information.

---

## Better

```
Manual Queue activated.

The Active Scoreboard now displays Bout #103.
```

---

## Better Still

```
Manual Queue now owns the Active Scoreboard.

Bout #103 is now ON GILAM.
```

The operator immediately understands:

- what happened
- what changed
- what the system is now doing

---

# Phase 5 — Build a Trust Language

Avoid vague wording.

Avoid generic wording.

Avoid ambiguous wording.

Instead, prefer terminology directly tied to the application's domain.

Examples:

Instead of:

- Updated
- Ready
- Processing
- Loading
- Complete

Prefer:

- Event Host Connected
- Manual Queue Activated
- Queue Advanced
- Winner Submitted
- Controller Ownership Transferred
- Scoreboard Projection Updated
- Event Host Resumed
- Synchronization Completed

These statements correspond to real application events.

---

# Phase 6 — Verify Every Indicator

For every badge, label, or status indicator determine:

Can this indicator ever be wrong?

If yes:

Determine why.

Possible causes include:

- asynchronous updates
- stale state
- delayed synchronization
- race conditions
- multiple competing state sources
- outdated cached values

The objective is to eliminate situations where the UI temporarily lies to the operator.

---

# Phase 7 — Eliminate Duplicate Sources of Truth

One of the largest causes of untrustworthy UI is duplicated state.

Investigate whether any indicator derives its value from multiple locations.

Examples:

Bad

```
Indicator

↓

State A

or

State B

depending on timing
```

Preferred

```
Indicator

↓

Single authoritative source
```

---

# Phase 8 — Standardize Feedback Behavior

Determine whether similar events produce similar feedback.

Examples:

Winner Submitted

Should always produce:

- success toast
- queue advancement message
- indicator updates

Reset

Should always produce:

- confirmation
- completion notification
- cleared indicators

Connection Lost

Should always produce:

- warning
- connection badge update
- synchronization state update

Consistency improves operator confidence.

---

# Phase 9 — Identify Missing Feedback

Look for operations that currently occur silently.

Examples may include:

- controller ownership changes
- synchronization completion
- Event Host takeover
- Manual Queue activation
- queue completion
- automatic queue progression

Determine whether operators would benefit from explicit feedback.

Not every internal event requires a toast.

However, important workflow transitions should be visible.

---

# Phase 10 — Produce Improvement Recommendations

After completing the audit, classify findings into categories.

## Category A

Behavior is already trustworthy.

No changes recommended.

---

## Category B

Correct behavior.

Wording improvement recommended.

---

## Category C

Correct wording.

Underlying condition needs improvement.

---

## Category D

Indicator cannot currently be trusted.

Requires architectural changes.

---

# Required Deliverables

Submit a report containing:

## 1.

Complete inventory of:

- Toasts
- Indicators
- Labels
- Badges
- Modal messages

---

## 2.

State Definition Matrix

Including:

- authoritative source
- display condition
- hide condition
- purpose

---

## 3.

Trustworthiness Assessment

Rate every feedback element:

✅ Trusted

🟡 Mostly Trusted

🔴 Untrusted

Explain why.

---

## 4.

Recommended Improvements

Classify by:

High Priority

Medium Priority

Low Priority

Include estimated implementation effort where possible.

---

## 5.

Architecture Assessment

Identify any feedback that currently depends upon:

- inferred state
- duplicated state
- asynchronous assumptions
- stale values
- race-prone logic

Recommend architectural improvements where appropriate.

---

# Important Constraints

During this planning phase:

Do NOT modify code.

Do NOT rename labels.

Do NOT redesign the UI.

Focus exclusively on:

- understanding current behavior
- documenting authoritative sources
- identifying trust issues
- recommending improvements

Implementation planning will occur after the review.

---

# Success Criteria

This initiative will be considered successful when:

- Every feedback element has one authoritative source.
- Every status indicator has a deterministic display condition.
- Every toast clearly communicates what changed.
- No UI element can display misleading information.
- Operators can confidently trust what the application is communicating without needing to verify it elsewhere.

The end goal is to make KTS feel like a professional officiating system where every notification, label, and indicator is a reliable reflection of the application's actual state.
