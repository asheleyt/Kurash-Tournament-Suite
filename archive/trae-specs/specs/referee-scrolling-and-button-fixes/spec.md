# Referee Controller Scrolling & Button Height Fixes Spec

## Why
The user identified three specific issues in the Referee Controller UI:
1.  **Scrolling**: Users should be able to scroll when the "Match Settings" panel is open (to see all inputs) but scrolling should be disabled when it is closed (to keep the interface fixed/compact).
2.  **Button Centering**: The score buttons (H, YO, CH) are too short (`h-20`), causing the zeros to feel cramped or not perfectly centered.
3.  **Button Consistency**: The "Reset" button height (`h-16`) does not match the "Start" button height (`h-12`).

## What Changes
- **Scrolling Logic**:
    - Bind the `overflow` class of the main container to the `isSettingsOpen` state.
    - `isSettingsOpen` ? `overflow-y-auto` : `overflow-hidden`.
- **Button Heights**:
    - Increase `ScoreButton` height from `h-20` to `h-24` (or similar) to provide more vertical space for the stacked label and number.
    - Change "Reset" button height from `h-16` to `h-12` to match the "Start" button.

## Impact
- **Affected code**:
    - `resources/js/Pages/refereeController.vue`

## MODIFIED Requirements

### Requirement: Scrolling Behavior
- **State-Dependent**: The main view SHALL scroll (`overflow-y-auto`) ONLY when "Match Settings" is open. Otherwise, it SHALL be fixed (`overflow-hidden`).

### Requirement: Button Dimensions
- **Score Buttons**: Height SHALL be increased to ensure the label and score value are comfortably centered vertically.
- **Control Buttons**: The "Reset" button height SHALL match the "Start" button height (`h-12`).
