# Refactor and Organize Code Spec

## Why
The codebase, particularly `refereeController.vue` and `kurashScoreBoard.vue`, has grown with new features (timers, medic logic, weight calculations, broadcasting). The user explicitly requested to "organize the codes and comment what block of code it is and what it does so its easier to understand." This will improve maintainability and readability.

## What Changes
- **Logical Grouping**: Reorder code in the `<script setup>` sections to follow a consistent structure:
    1.  **Imports**: Libraries, Components, Types.
    2.  **Props & Emits**: Component interface.
    3.  **State Definition**: Reactive variables (`gameState`, `scores`, etc.).
    4.  **Constants & Helpers**: Static data (e.g., weight categories) and utility functions.
    5.  **Computed Properties**: Derived state.
    6.  **Watchers**: Side effects based on state changes.
    7.  **Event Handlers**:
        - Timer logic
        - Score updates
        - Medic logic
        - Reset logic
    8.  **Broadcasting**: Echo/Pusher setup and listeners.
    9.  **Lifecycle Hooks**: `onMounted`, `onUnmounted`.
- **Documentation**:
    - Add "Block Comments" (headers) for each section (e.g., `/* --- TIMER LOGIC --- */`).
    - Add JSDoc-style comments for complex functions explaining parameters and intent.
    - Inline comments for tricky logic (e.g., the `setInterval` synchronization fix).

## Impact
- **Affected files**:
    - `resources/js/Pages/refereeController.vue`
    - `resources/js/Pages/kurashScoreBoard.vue`
- **Functional Impact**: ZERO. This is a pure refactor. The application behavior must remain exactly the same.

## ADDED Requirements
### Requirement: Code Organization
The code SHALL be grouped by functional area (Imports, State, Logic, Events) with clear visual separators.

### Requirement: Comments
Major logical blocks and complex functions SHALL have explanatory comments.

## MODIFIED Requirements
None. Functional requirements remain unchanged.
