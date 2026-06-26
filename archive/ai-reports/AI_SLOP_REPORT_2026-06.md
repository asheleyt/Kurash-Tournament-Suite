# AI Slop Analysis Report: Kurash Tournament Suite

**Generated:** Sat Jun 27 2026
**Tool:** fallow v2.102.0
**Overall Health Score:** 15.6/100 — Grade F

---

## Executive Summary

This codebase is **critically unhealthy**. The health score of 15.6/100 with an F grade indicates severe structural problems consistent with rapid, unreviewed AI-assisted code generation. 86.5% of files are unreachable dead code, 68.4% of exports are never imported, and 641 functions exceed complexity thresholds.

---

## Key Metrics

| Metric | Value | Severity |
|--------|-------|----------|
| Health Score | 15.6/100 (Grade F) | CRITICAL |
| Dead Files | 231 of 267 (86.5%) | CRITICAL |
| Dead Exports | 182 of 266 (68.4%) | CRITICAL |
| Functions Above Complexity Threshold | 641 of 2,773 (23.1%) | HIGH |
| Critical Complexity Count | 260 functions | HIGH |
| High Complexity Count | 184 functions | HIGH |
| Duplicate Code | 2,140 lines (4.9%) across 70 clone groups | MEDIUM |
| Unused Dependencies | 10 packages | MEDIUM |
| Circular Dependencies | 5 cycles | MEDIUM |

---

## The "AI Slop" Fingerprints

### 1. Massive Dead Code Graveyard (86.5% of files unused)

- **231 files** are completely unreachable from entry points
- **182 exports** are never imported anywhere
- This is the #1 sign of AI-generated code: the AI writes "complete" modules with exports nobody uses, then moves on to the next feature

**Worst offenders:**

| File | Unused Exports | Total Value Exports | Dead Ratio |
|------|----------------|---------------------|------------|
| `useRingMatchOrderProjection.ts` | 14 | 14 | 100% |
| `useLocalScoreboardState.ts` | 4 | — | — |
| `useAppearance.ts` | 3 | — | — |
| `flagAssets.ts` | 2 | — | — |
| `useBroadcast.ts` | 1 | 1 | 100% |
| `useCurrentUrl.ts` | 1 | 1 | 100% |
| `useInitials.ts` | 2 | 2 | 100% |
| `useKeyboardShortcuts.ts` | 1 | 1 | 100% |
| `useTwoFactorAuth.ts` | 1 | 1 | 100% |

The entire `useRingMatchOrderProjection.ts` module is dead — 14 of 14 value exports are never imported.

### 2. God Objects / Mega-Files

These files are so large they've become unmaintainable:

| File | Lines | Functions | Cognitive Complexity |
|------|-------|-----------|---------------------|
| `refereeController.template.html` | 4,567 | 1 | 47 |
| `kurashScoreBoard.vue` | 3,324 | 33 | 68 (template) |
| `RefereeDisplayManagementPanel.vue` | 2,175 | 1 | **372** (template!) |
| `refereeController.setup.ts` | 8,000+ | 50+ | Multiple >30 |
| `useRefereeQueueSync.ts` | 1,820 | 17 | 176 (single function!) |
| `useRefereeDisplayManagement.ts` | 1,197 | 22 | 31 |
| `ringMatchOrder.vue` | 1,735 | 19 | 32 |
| `runtime-orchestrator.js` | 2,000+ | 26 | 76 |

**The smoking gun:** `fetchScoreboardData` in `useRefereeQueueSync.ts` has **cognitive complexity of 176** — that's a single function that's essentially an entire application's worth of logic.

### 3. Extreme Complexity Hotspots

Functions with cognitive complexity > 100 (threshold is 15):

| Function | File | Cognitive Complexity |
|----------|------|---------------------|
| `<template>` | `RefereeDisplayManagementPanel.vue` | **372** |
| `fetchScoreboardData` | `useRefereeQueueSync.ts` | **176** |
| `inferredRoundMeta` | `useRefereeBracketInference.ts` | **131** |
| `attr` | `highcharts.js` (vendored) | 132 |
| `drawDataLabels` | `highcharts.js` (vendored) | 120 |
| `<template>` | `kurashScoreBoard.vue` | 68 |
| `runPhpPreflight` | `runtime-orchestrator.js` | 76 |
| `<arrow>` | `useRingDisplayQueue.ts` | 96 |

### 4. Copy-Paste Duplication Pattern

70 clone groups with 145 instances. The pattern is clear: AI generates similar code blocks in different files without extracting shared logic.

**Worst duplicates:**

| Files | Duplicated Lines | Description |
|-------|------------------|-------------|
| `useRefereeBracketInference.ts` ↔ `useRefereeControllerQueueHelpers.ts` | 100 | Identical `getAgeCategoryLabel`, `getWeightCategoryLabel`, `getMatchRingText` helpers |
| `refereeController.setup.ts` (internal) | 185 | 10 clone groups — asset resolution, queue management, result submission repeated |
| `kurashScoreBoard.vue` (internal) | 58 | Duplicate template blocks |
| `useRefereeQueueSync.ts` (internal) | 42 | Duplicate queue row processing |
| `Password.vue` ↔ `Profile.vue` | 21 | Identical form success transition template |
| `useRefereeBracketInference.ts` (internal) | 31 | Duplicate round name parsing logic |

### 5. Circular Dependencies in UI Components

5 circular import cycles, all in the `components/ui/` directory (shadcn-vue pattern):

- `Alert.vue` ↔ `alert/index.ts`
- `Badge.vue` ↔ `badge/index.ts`
- `Button.vue` ↔ `button/index.ts`
- `NavigationMenuTrigger.vue` ↔ `navigation-menu/index.ts`
- `SidebarMenuButton.vue` → `SidebarMenuButtonChild.vue` → `index.ts` → back

### 6. Phantom Dependencies

| Package | Location | Issue |
|---------|----------|-------|
| `axios` | `dependencies` | Declared but never imported (likely replaced by fetch) |
| `@eslint/js` | `devDependencies` | Never imported |
| `eslint-import-resolver-typescript` | `devDependencies` | Never imported |
| `package-lock` | `dependencies` (!) | Not a real package |
| `@rollup/rollup-linux-x64-gnu` | `optionalDependencies` | Platform-specific, unused on this machine |
| `@rollup/rollup-win32-x64-msvc` | `optionalDependencies` | Platform-specific, unused on this machine |
| `@tailwindcss/oxide-linux-x64-gnu` | `optionalDependencies` | Platform-specific, unused on this machine |
| `@tailwindcss/oxide-win32-x64-msvc` | `optionalDependencies` | Platform-specific, unused on this machine |
| `lightningcss-linux-x64-gnu` | `optionalDependencies` | Platform-specific, unused on this machine |
| `lightningcss-win32-x64-msvc` | `optionalDependencies` | Platform-specific, unused on this machine |

---

## Hotspot Analysis (Frequently Changed + Complex)

Files ranked by hotspot score (combines complexity, commit frequency, and churn):

| File | Score | Commits | Lines Added | Lines Deleted | Trend |
|------|-------|---------|-------------|---------------|-------|
| `refereeController.setup.ts` | **64.8** | 12 | +10,603 | -2,334 | cooling |
| `electron-app/index.js` | 45.4 | 11 | +1,168 | -73 | cooling |
| `useRefereeQueueSync.ts` | 31.5 | 5 | +1,839 | -20 | cooling |
| `ringMatchOrder.vue` | 22.0 | 6 | +1,829 | -95 | cooling |
| `useRefereeDisplayManagement.ts` | 20.8 | 4 | +1,211 | -15 | cooling |
| `useRefereeRingMatchOrderSync.ts` | 19.4 | 4 | +507 | -6 | stable |
| `useRefereeControllerDisplayManagement.ts` | 17.6 | 4 | +579 | -5 | stable |
| `window-manager.js` | 16.8 | 4 | +2,451 | -17 | stable |
| `runtime-orchestrator.js` | 16.4 | 6 | +2,243 | -103 | stable |
| `useRefereeControllerQueuePreview.ts` | 15.4 | 3 | +358 | -4 | cooling |

The `refereeController.setup.ts` file is the **epicenter** — 10,603 lines added across 12 commits, with a complexity density of 0.3. This is a file that has been continuously expanded without refactoring.

---

## Largest Functions (by line count)

| Function | File | Lines |
|----------|------|-------|
| `<template>` | `refereeController.template.html` | 4,566 |
| `<template>` | `kurashScoreBoard.vue` | 3,323 |
| `<template>` | `RefereeDisplayManagementPanel.vue` | 2,174 |
| `<template>` | `ringMatchOrder.vue` | 1,734 |
| `useRefereeQueueSync` | `useRefereeQueueSync.ts` | 1,682 |
| `useRefereeDisplayManagement` | `useRefereeDisplayManagement.ts` | 1,079 |
| `<template>` | `Welcome.vue` | 854 |
| `useRefereeControllerSyncPanels` | `useRefereeControllerSyncPanels.ts` | 834 |
| `handleSubmitResult` | `refereeController.setup.ts` | 829 |
| `useRefereeControllerSession` | `useRefereeControllerSession.ts` | 571 |

---

## Health Score Penalty Breakdown

| Penalty Category | Score Impact | Notes |
|------------------|--------------|-------|
| Unused dependencies | -18.8 | 10 unused packages including phantom `package-lock` |
| Dead files | -15.0 | 231 of 267 files unreachable |
| Maintainability | -15.0 | Low maintainability in 21.9% of files |
| Dead exports | -13.7 | 182 exports never imported |
| Unit size | -10.0 | 9.6% medium-risk, 5.5% high-risk, 4.1% very-high-risk units |
| Circular deps | -9.4 | 5 circular import cycles |
| Complexity | -2.0 | 641 functions above threshold |
| Coupling | -0.5 | 0.9% high-risk coupling |
| Duplication | 0.0 | 4.9% duplication (within acceptable range) |

---

## Unit Size Profile

| Risk Level | Percentage |
|------------|------------|
| Low risk | 80.8% |
| Medium risk | 9.6% |
| High risk | 5.5% |
| Very high risk | 4.1% |

41.5 functions per 1,000 lines exceed 60 LOC — a sign of functions that are too large.

---

## Vue Framework Health

| Detector | Status |
|----------|--------|
| unrendered-component | active |
| unused-component-prop | active |
| unused-component-emit | active |
| unprovided-inject | active |

---

## Verdict

This project exhibits classic **"AI slop" patterns:**

1. **Write-only code**: 86.5% of files are dead — code was generated but never wired up
2. **No refactoring**: Functions grew to 100-376 lines of cognitive complexity without decomposition
3. **Copy-paste proliferation**: Identical helper functions duplicated across files instead of extracted to shared modules
4. **Abandoned abstractions**: Entire composables (`useAppearance`, `useBroadcast`, `useCurrentUrl`, `useInitials`, etc.) were created and then never used
5. **Dependency bloat**: `axios` declared but unused, `package-lock` listed as a dependency

---

## Recommended Remediation Priority

1. **CRITICAL**: Delete the 231 dead files and 182 dead exports — this is low-risk, high-impact cleanup
2. **HIGH**: Remove phantom dependencies (`axios`, `package-lock`, unused dev deps)
3. **HIGH**: Extract shared helpers from `useRefereeBracketInference.ts` / `useRefereeControllerQueueHelpers.ts` duplication
4. **HIGH**: Break down `fetchScoreboardData` (176 cognitive complexity) into smaller functions
5. **MEDIUM**: Split `refereeController.setup.ts` (8,000+ lines) into focused modules
6. **MEDIUM**: Decompose `RefereeDisplayManagementPanel.vue` template (372 cognitive complexity)
7. **LOW**: Resolve circular dependencies in UI component barrel files

---

*Generated by fallow v2.102.0 — free static analysis for JavaScript and TypeScript*
