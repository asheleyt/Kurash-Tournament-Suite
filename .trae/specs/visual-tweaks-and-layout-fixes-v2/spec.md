# Fix Referee UI Stretch & Keyboard Colors Spec

## Why
The user feels the referee controller interface is "stretched" after the recent width increase (likely buttons becoming too wide). Additionally, the keyboard shortcuts section uses a generic blue color for all categories, whereas Player 1 (Green) and Player 2 (Cyan) should be color-coded for better recognition.

## What Changes
- **Layout**: Reduce the `refereeController` container max-width from `1920px` to `1600px` (or `90%`) to find a balance between "too much whitespace" and "stretched UI".
- **Keyboard Settings**: Update `KeyboardSettings.vue` to dynamically color the category headers:
  - "Player 1 (Left)" -> Green
  - "Player 2 (Right)" -> Cyan
  - Others -> Blue (Default)

## Impact
- **Affected Specs**: `referee-controller`
- **Affected Code**: 
  - `resources/js/pages/refereeController.vue`
  - `resources/js/components/Referee/KeyboardSettings.vue`

## MODIFIED Requirements
### Requirement: Layout Constraints
The referee interface SHALL be responsive but constrained to a maximum width (approx 1600px) to prevent UI elements from becoming uncomfortably wide on ultra-large screens.

### Requirement: Keyboard Settings Color Coding
The Keyboard Shortcuts panel SHALL display category headers in colors matching the player:
- **Player 1 / Left**: Green text and indicator.
- **Player 2 / Right**: Cyan text and indicator.
- **Global / Other**: Blue text and indicator.

#### Scenario: Viewing Keyboard Settings
- **WHEN** user opens the Keyboard Shortcuts tab
- **THEN** the "Player 1 (Left)" header is Green
- **AND** the "Player 2 (Right)" header is Cyan
