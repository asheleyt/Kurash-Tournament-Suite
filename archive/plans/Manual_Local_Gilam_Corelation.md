# Manual Queue ↔ Local Gilam Correlation — Implementation Plan

**Date:** 2026-06-25
**Status:** Planning — v3 (Auto-fallback + Push to Gilam)
**Goal:** Let operators queue manual bouts that appear on the Gilam (ring match order) display, independent of Event Host polling.

---

## Problem

When running without an Event Host connection (or when the queue is empty between rounds), operators use the Manual Setup tab to create bouts. These bouts only update the local scoreboard — they never appear on the Gilam display. Operators resort to paper to track the local match order.

## Solution

Add a **Manual Match Queue** — a dedicated, persistent list of manual bouts that feeds into the Gilam display. No mode switch. The system picks the right source automatically, with an explicit escape hatch.

### Design Principles

- **No mode switch** — the system auto-selects the right source
- Event Host queue is authoritative when active (has items)
- Manual queue is the fallback when Event Host queue is empty/unavailable
- "Push to Gilam" button on each manual bout for the edge case where the operator needs to force it onto the display
- Manual queue persists across page refreshes (localStorage)
- Clear/reset button to empty the queue intentionally
- **Event Host projection publishing is suppressed while a manual override is active**

---

## Source Selection Logic (Auto-Fallback)

```
Is there an active manual override (pushed item)?
  YES → Show manual queue on Gilam
  NO  → Is Event Host queue non-empty?
          YES → Show Event Host queue on Gilam
          NO  → Is manual queue non-empty?
                  YES → Show manual queue on Gilam
                  NO  → Show placeholder cards on Gilam
```

In plain English:
1. **Event Host is the default.** When it has data, the Gilam shows it.
2. **Manual queue auto-fills the gap.** When Event Host is empty (between rounds, no connection), the Gilam automatically shows whatever manual bouts exist.
3. **"Push to Gilam" overrides everything.** If the operator explicitly pushes a manual bout, it appears on the Gilam regardless of Event Host state. The override stays until the pushed bout is completed or the operator explicitly clears it — it does NOT clear on the next Event Host poll, which avoids flicker.

This means:
- 90% of the time: Event Host drives the Gilam, manual queue is invisible
- During dry runs / offline events: manual queue drives the Gilam automatically
- Edge case: operator pushes a manual bout while Event Host is active, it shows temporarily

---

## Data Flow

```
Manual Setup Form
  → "Update Scoreboard" click
  → Confirmation modal
  → applyMatchSettings()
  → push to manualQueue[] (reactive array)
  → persist to localStorage
  → evaluateSourceAndPublish() (auto-fallback logic)
      → if manual override is active: publish manual queue
      → else if Event Host has data: let Event Host drive (no-op)
      → else if manual queue has data: publish manual queue
      → else: publish placeholder cards
  → Gilam page receives broadcast → renders queue
```

---

## Critical Guard: Suppress Event Host During Manual Override

Without this guard, Event Host sync broadcasts every 5 seconds and overwrites a manual push.

**Where:** `useRefereeRingMatchOrderSync.ts` — the polling gate.

**How:** The `isRingMatchOrderLive` computed (line 37) already controls whether polling and fetching happen. We add a new computed that wraps it:

```typescript
const isEventHostProjectionActive = computed(() => {
  // Suppress Event Host projection when a manual override is active
  if (manualOverrideActive.value) return false
  return isRingMatchOrderLive.value
})
```

This computed replaces `isRingMatchOrderLive` in the polling gate. The Event Host polling timer still ticks internally, but `fetchRingMatchOrderProjectionOnce()` and `syncRingMatchOrderProjectionPolling()` skip their work when the gate returns false.

**Result:** When the operator pushes a manual bout, the Event Host stops writing to the Gilam channel. The manual override has exclusive control until the pushed bout is completed or the operator manually clears it. The override does NOT auto-clear on the next poll — this prevents flicker.

---

## Files to Modify

### 1. `useRefereeRingMatchOrderSync.ts` — Suppress Event Host during manual override

**Add `manualOverrideActive` as an option parameter** (already available from the controller setup composable).

**Modify the polling gate:** Replace `isRingMatchOrderLive` checks with the new `isEventHostProjectionActive` computed that returns `false` when `manualOverrideActive.value === true`.

Lines affected:
- Line 338: `fetchRingMatchOrderProjectionOnce()` — gate check
- Line 452: `syncRingMatchOrderProjectionPolling()` — gate check

Both already check `isRingMatchOrderLive`. Swap to the new computed. No other changes needed in this file.

### 2. `refereeController.setup.ts` — Core logic

**Add manual queue state (~line 565, after `manualMatchId`):**

```typescript
interface ManualQueueItem {
  id: string                    // unique: `manual_${Date.now()}_${counter}`
  matchId: string               // user-entered match ID (optional)
  bracketCategory: string       // age category
  gender: 'male' | 'female' | '' | 'N/A'
  category: string              // weight
  player1: { name: string; clubCode: string; country: string; flag: string }
  player2: { name: string; clubCode: string; country: string; flag: string }
  createdAt: number             // timestamp
}

const manualQueue = ref<ManualQueueItem[]>([])
const activeManualItemId = ref<string | null>(null)
const manualOverrideItemId = ref<string | null>(null)  // explicit "Push to Gilam" target
```

**Note on status derivation:** No `status` field is stored. Status is always computed from queue order + the active pointer:

```typescript
function getManualItemStatus(item: ManualQueueItem): 'active' | 'queued' | 'completed' {
  if (item.id === activeManualItemId.value) return 'active'
  const activeIndex = manualQueue.value.findIndex(i => i.id === activeManualItemId.value)
  const itemIndex = manualQueue.value.findIndex(i => i.id === item.id)
  if (activeIndex === -1) return 'queued'
  return itemIndex < activeIndex ? 'completed' : 'queued'
}
```

**Derived reactive state for auto-fallback:**

```typescript
// Does the Event Host currently have data to show?
const eventHostHasData = computed(() => {
  // Check if the Event Host projection record has non-empty items
  // This is already tracked by the existing queue/preview composables
  return matchesList.value.length > 0
})

// Is a manual override currently active?
const manualOverrideActive = computed(() => {
  return manualOverrideItemId.value !== null
})

// Which source should drive the Gilam right now?
const activeGilamSource = computed<'event_host' | 'manual'>(() => {
  if (manualOverrideActive.value) return 'manual'
  if (eventHostHasData.value) return 'event_host'
  return manualQueue.value.length > 0 ? 'manual' : 'event_host'
})
```

**localStorage persistence (versioned keys):**

```typescript
const MANUAL_QUEUE_STORAGE_KEY = 'kurash:manual-match-queue:v1'
const MANUAL_QUEUE_ACTIVE_ID_KEY = 'kurash:manual-active-item:v1'
const MANUAL_QUEUE_OVERRIDE_ID_KEY = 'kurash:manual-override-item:v1'

function persistManualQueue() { ... }
function loadManualQueue(): ManualQueueItem[] { ... }
function persistActiveManualItemId() { ... }
function loadActiveManualItemId(): string | null { ... }
function persistManualOverrideItemId() { ... }
function loadManualOverrideItemId(): string | null { ... }
```

**Note:** No `activeQueueSource` is persisted. The source is derived from state, not stored.

**Modify `applyMatchSettings()` (~line 1510):**
After transferring tempSettings to gameState and calling `broadcastAll()`:

```typescript
// Add to manual queue
const newItem: ManualQueueItem = {
  id: `manual_${Date.now()}_${manualQueueCounter++}`,
  matchId: tempSettings.matchId,
  bracketCategory: tempSettings.bracketCategory,
  gender: tempSettings.gender,
  category: tempSettings.category,
  player1: { ...tempSettings.player1 },
  player2: { ...tempSettings.player2 },
  createdAt: Date.now(),
}
manualQueue.value.push(newItem)
persistManualQueue()

// First item becomes active automatically
if (!activeManualItemId.value) {
  activeManualItemId.value = newItem.id
  persistActiveManualItemId()
}

// Auto-publish if manual source is active (Event Host is empty)
evaluateSourceAndPublish()
```

**Add `evaluateSourceAndPublish()`:**
The core auto-fallback function. Called after any queue mutation.

```typescript
function evaluateSourceAndPublish() {
  const source = activeGilamSource.value

  if (source === 'manual') {
    publishManualQueueToGilam()
  }
  // If source is 'event_host', do nothing — Event Host polling handles it
}
```

**Add `publishManualQueueToGilam()`:**
Builds a projection payload from the manual queue and publishes via the existing `publishRingMatchOrderProjectionRecord()`.

```typescript
function publishManualQueueToGilam() {
  const activeId = manualOverrideItemId.value || activeManualItemId.value
  const activeIndex = activeId
    ? manualQueue.value.findIndex(i => i.id === activeId)
    : -1

  const items = manualQueue.value
    .filter((_item, index) => {
      if (activeIndex >= 0 && index < activeIndex) return false   // skip completed
      return true
    })
    .map((item, displayIndex) => ({
      ...item,
      player_one: buildManualParticipant(item, 'player1'),
      player_two: buildManualParticipant(item, 'player2'),
      role: displayIndex === 0 ? 'On Mat' : displayIndex === 1 ? 'Next' : `Queue ${displayIndex - 1}`,
      slot_role: displayIndex === 0 ? 'ON_MAT' : displayIndex === 1 ? 'ON_DECK' : 'IN_QUEUE',
      slot_index: displayIndex,
      source: 'manual_queue',
    }))

  const record: RingMatchOrderProjectionRecord = {
    key: buildManualQueueProjectionKey(ringNumber),
    payload: { items, success: true, source: 'manual_queue' },
    lastSuccessAt: Date.now(),
    lastAttemptAt: Date.now(),
    lastError: null,
    meta: buildManualQueueProjectionMeta(ringNumber),
  }

  publishRingMatchOrderProjectionRecord(record)
}
```

**Add `pushManualItemToGilam(id)`:**
The explicit "Push to Gilam" action. Sets the override, suppresses Event Host, publishes.

```typescript
function pushManualItemToGilam(id: string) {
  manualOverrideItemId.value = id
  persistManualOverrideItemId()
  publishManualQueueToGilam()
}

function clearManualOverride() {
  manualOverrideItemId.value = null
  persistManualOverrideItemId()
  evaluateSourceAndPublish()
}
```

**Add `advanceManualQueue()`:**
Called explicitly when a bout is completed. Moves the active pointer to the next queued item.

```typescript
function advanceManualQueue() {
  const currentIndex = manualQueue.value.findIndex(i => i.id === activeManualItemId.value)
  if (currentIndex === -1 || currentIndex >= manualQueue.value.length - 1) {
    activeManualItemId.value = null
  } else {
    activeManualItemId.value = manualQueue.value[currentIndex + 1].id
  }
  persistActiveManualItemId()

  // Override only clears when the pushed bout is completed (not on every advance)
  if (manualOverrideItemId.value) {
    manualOverrideItemId.value = null
    persistManualOverrideItemId()
  }

  evaluateSourceAndPublish()
}
```

**Add other queue management functions:**

```typescript
function removeManualQueueItem(id: string) {
  const wasActive = activeManualItemId.value === id
  manualQueue.value = manualQueue.value.filter(i => i.id !== id)
  persistManualQueue()

  if (wasActive) {
    activeManualItemId.value = manualQueue.value.length > 0 ? manualQueue.value[0].id : null
    persistActiveManualItemId()
  }

  // Clear override if the removed item was the pushed one
  if (manualOverrideItemId.value === id) {
    manualOverrideItemId.value = null
    persistManualOverrideItemId()
  }

  evaluateSourceAndPublish()
}

function clearManualQueue() {
  manualQueue.value = []
  activeManualItemId.value = null
  manualOverrideItemId.value = null
  persistManualQueue()
  persistActiveManualItemId()
  persistManualOverrideItemId()

  evaluateSourceAndPublish()
}
```

**Modify `confirmResetAll()` (~line 1475):**
After clearing the current match, advance the queue if it's a manual bout:

```typescript
// At the end of confirmResetAll(), after clearing state:
if (activeManualItemId.value) {
  advanceManualQueue()
}
```

**Modify `clearCompletedBoutToWaitingState()` (~line 1491):**
Same pattern:

```typescript
// At the end, after clearing state:
if (activeManualItemId.value) {
  advanceManualQueue()
}
```

**Initialize on mount:**

```typescript
manualQueue.value = loadManualQueue()
activeManualItemId.value = loadActiveManualItemId()
manualOverrideItemId.value = loadManualOverrideItemId()

// Publish manual queue if it's the active source (Event Host is empty)
nextTick(() => evaluateSourceAndPublish())
```

### 3. `refereeController.template.html` — UI additions

**Queue list** — Below the "Update Scoreboard" button (~line 2170):

```html
<!-- Manual Match Queue -->
<div v-if="manualQueue.length > 0" class="rounded-2xl border border-white/10 bg-black/40 p-5">
  <div class="mb-4 flex items-center justify-between">
    <div class="text-[10px] font-black tracking-widest text-gray-500 uppercase">
      Manual Queue ({{ manualQueue.length }} bouts)
    </div>
    <button
      @click="clearManualQueue"
      class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 uppercase tracking-wide hover:bg-red-500/20"
    >
      Clear All
    </button>
  </div>

  <div class="flex flex-col gap-2">
    <div
      v-for="item in manualQueue"
      :key="item.id"
      class="flex items-center justify-between rounded-xl border px-4 py-3 transition-all"
      :class="getManualItemStatus(item) === 'active'
        ? 'border-amber-500/40 bg-amber-500/10'
        : getManualItemStatus(item) === 'completed'
          ? 'border-white/5 bg-white/[0.02] opacity-40'
          : 'border-white/10 bg-white/[0.03]'"
    >
      <div class="flex items-center gap-3">
        <span
          class="rounded-md px-2 py-0.5 text-[10px] font-black tracking-wider uppercase"
          :class="getManualItemStatus(item) === 'active'
            ? 'bg-amber-500/20 text-amber-400'
            : getManualItemStatus(item) === 'completed'
              ? 'bg-white/5 text-gray-600'
              : 'bg-white/10 text-gray-500'"
        >
          {{ getManualItemStatus(item) === 'active' ? 'ON MAT' : getManualItemStatus(item) === 'completed' ? 'DONE' : 'QUEUED' }}
        </span>
        <span class="text-sm font-semibold text-white">
          {{ item.player1.name || 'TBD' }} vs {{ item.player2.name || 'TBD' }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">
          {{ item.category ? item.category + 'kg' : '' }}
          {{ item.bracketCategory ? '/ ' + item.bracketCategory : '' }}
        </span>

        <!-- Push to Gilam button (only for non-active, non-completed items) -->
        <button
          v-if="getManualItemStatus(item) === 'queued'"
          @click="pushManualItemToGilam(item.id)"
          class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wide hover:bg-amber-500/20 transition-colors"
        >
          Push
        </button>

        <!-- Active override indicator -->
        <span
          v-if="manualOverrideItemId === item.id"
          class="rounded-lg bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wide"
        >
          On Gilam
        </span>

        <button
          v-if="getManualItemStatus(item) !== 'active'"
          @click="removeManualQueueItem(item.id)"
          class="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-red-400 transition-colors"
        >
          <!-- X icon -->
        </button>
      </div>
    </div>
  </div>
</div>
```

**Confirmation modal** — Change button text to "Add to Queue" (~line 4460):

```html
<button @click="applyMatchSettings" class="...">
  Add to Queue
</button>
```

Note: The button always says "Add to Queue" now since manual setup always queues. The bout auto-appears on the Gilam if Event Host is empty, or stays hidden until pushed if Event Host is active.

### 4. `useRingMatchOrderProjection.ts` — Manual projection key

```typescript
export function buildManualQueueProjectionKey(ring: string) {
  return `manual|local|${ring || 'default'}`
}

export function buildManualQueueProjectionMeta(ring: string): RingMatchOrderProjectionMeta {
  return {
    key: buildManualQueueProjectionKey(ring),
    adminBaseNormalized: 'local',
    tournamentId: null,
    tournamentName: 'Manual Queue',
    ring: ring || 'default',
    snapshotId: null,
    updatedAt: Date.now(),
  }
}
```

### 5. No changes needed to:

| File | Reason |
|------|--------|
| `ringMatchOrder.vue` | Passive consumer — already listens on BroadcastChannel and renders whatever items it receives |
| `useRingDisplayQueue.ts` | Used for Event Host queue path only |
| `useRefereeControllerQueuePreview.ts` | Used for Event Host queue path only |

---

## Persistence

| Data | Storage Key | Format |
|------|------------|--------|
| Manual queue items | `kurash:manual-match-queue:v1` | `ManualQueueItem[]` JSON |
| Active item pointer | `kurash:manual-active-item:v1` | Item ID string |
| Override item pointer | `kurash:manual-override-item:v1` | Item ID string |

All loaded on controller mount, persisted on every mutation. Versioned keys allow safe schema evolution.

**Note:** No source mode is persisted. The active source is always derived from state.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Event Host has data, operator adds manual bout | Bout enters queue but does NOT appear on Gilam (Event Host is authoritative). Operator can "Push" it if needed. |
| Event Host is empty, operator adds manual bout | Bout auto-appears on Gilam immediately (auto-fallback). |
| Operator pushes manual bout while Event Host is active | Event Host polling suppressed. Manual bout appears on Gilam. Override stays until the bout completes or operator manually clears it — does NOT auto-clear on next poll. |
| Event Host data arrives while manual override is active | Event Host poll is suppressed. Manual override stays until pushed bout completes or operator clears it. No flicker. |
| Page refresh | Queue + active item + override restored from localStorage. `evaluateSourceAndPublish()` re-runs on mount. |
| Queue exceeds 5 items | Gilam shows top 5 (On Mat + Next + Queue 1-3). Extras visible in controller list, become visible as items complete. |
| Complete a bout | `advanceManualQueue()` moves active pointer. If completed item was the pushed override, override clears. Gilam auto-falls back to Event Host if it has data. |
| All manual bouts completed | Active pointer is null. Event Host takes over if it has data, otherwise Gilam shows placeholders. |
| Remove active item | Next queued item promoted to active, or active pointer cleared if queue empty. Source re-evaluated. |

---

## Verification

1. **Auto-fallback (Event Host empty):** Event Host has no matches → add manual bout → Gilam shows it in On Mat slot automatically
2. **Event Host active:** Event Host has matches → add manual bout → bout enters queue but does NOT appear on Gilam
3. **Push to Gilam:** Event Host active → add manual bout → click "Push" → bout appears on Gilam, Event Host polling suppressed
4. **Override clears on completion:** Pushed bout completes → override clears → Event Host resumes. No flicker during the override period.
5. **Multiple items:** Add 3+ manual bouts with Event Host empty → Gilam shows On Mat / Next / Queue 1
6. **Queue advancement:** Complete On Mat bout → queue auto-advances, next item shown on Gilam
7. **Persistence:** Add manual bouts → refresh controller page → queue + active item restored, auto-publish if Event Host empty
8. **Clear queue:** Click "Clear All" → queue empty, Gilam falls back to Event Host (or shows placeholders if also empty)
9. **Remove item:** Remove a queued item → Gilam updates, source re-evaluated
