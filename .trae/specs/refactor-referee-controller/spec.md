# Refactor Referee Controller Spec

## Why
The `refereeController.vue` file is currently monolithic (~1400 lines), containing mixed concerns including UI components, heavy business logic, large hardcoded data sets, and repetitive API broadcasting code. This makes maintenance difficult, testing hard, and increases the risk of bugs during future updates.

## What Changes
- **Extract Components**: Move inline components (`ScoreButton`, `PenaltyButton`, Icons) into their own `.vue` files.
- **Externalize Data**: Move the large `availableFlags` array to a dedicated constants file.
- **Unify Broadcasting**: Create a `useBroadcast` composable to centralize and deduplicate the repetitive `fetch` logic for server communication.
- **Structure**: Organize the `refereeController.vue` to focus on layout and state orchestration, delegating logic to composables and presentation to sub-components.

## Impact
- **Affected specs**: None (internal refactoring).
- **Affected code**: 
    - `resources/js/Pages/refereeController.vue` (Major cleanup)
    - New files in `resources/js/Components/Referee/`
    - New composable `resources/js/Composables/useBroadcast.ts`
    - New constant file `resources/js/Constants/countries.ts`

## ADDED Requirements
### Requirement: Component Extraction
The system SHALL provide separate Vue components for:
- `ScoreButton.vue`: Handling score display and interaction.
- `PenaltyButton.vue`: Handling penalty toggles and styling.
- `RefereeIcons.vue`: (Or individual icon files) containing the SVG definitions.

### Requirement: Centralized Broadcasting
The system SHALL use a generic broadcasting mechanism that:
- Accepts an event type and payload.
- Handles CSRF tokens automatically.
- Centralizes error handling.

## MODIFIED Requirements
### Requirement: Referee Controller Logic
The `refereeController.vue` SHALL import components and composables rather than defining them inline. Logic for "Jazo", "Medic", and "Penalties" remains but will use the new broadcasting utility.
