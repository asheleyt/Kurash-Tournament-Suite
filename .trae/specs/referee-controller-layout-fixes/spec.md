# Referee Controller Layout & Button Fixes Spec

## Why
The user provided feedback on the Referee Controller:
1.  **Vertical Alignment**: The interface is bunched up at the top ("too upward"). It should be vertically centered or distributed to "fill the screen".
2.  **Button Overlap**: The labels (H, YO, CH) on the score buttons are overlapping with the score numbers (zeros).

## What Changes
- **Referee Controller Layout**:
    - Change the main container to use `flex flex-col justify-center` (or `h-full` with `justify-evenly`) to better utilize the vertical screen real estate.
    - Increase vertical gaps slightly to reduce the "cramped" feeling.
- **Score Buttons**:
    - Refactor `ScoreButton` component to use a standard Flex Column layout instead of absolute positioning.
    - This will stack the Label and the Number naturally, preventing any overlap regardless of button size.

## Impact
- **Affected code**:
    - `resources/js/Pages/refereeController.vue`

## MODIFIED Requirements

### Requirement: Vertical Layout
- **Alignment**: The main content of the Referee Controller SHALL be vertically centered or distributed to fill the viewport height, rather than sticking to the top edge.

### Requirement: Score Button Legibility
- **No Overlap**: The label (H/YO/CH) and the score value SHALL NOT overlap.
- **Layout**: They SHALL be stacked vertically with sufficient spacing.
