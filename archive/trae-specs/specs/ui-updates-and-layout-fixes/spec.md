# UI Updates and Layout Fixes Spec

## Why
The user requests specific visual changes to the Scoreboard (default labels, colors) and functional/layout improvements to the Referee Controller (Country input type, layout robustness for long names).

## What Changes
- **Scoreboard**:
    - Change default "Gender" text from "Male" to "N/A".
    - Change "H", "YO", "CH" label color to Gold.
- **Referee Controller**:
    - Change "Country" input to "Country Code" dropdown (Select menu).
    - Populate dropdown with country codes (text only), reusing existing country data.
    - Fix layout issues in the Match Settings panel where long inputs cause alignment breaks.

## Impact
- **Affected code**:
    - `resources/js/Pages/kurashScoreBoard.vue`
    - `resources/js/Pages/refereeController.vue`

## MODIFIED Requirements

### Requirement: Scoreboard Defaults & Style
- **Default State**: When no gender is selected, the scoreboard SHALL display "N/A" instead of "Male".
- **Color**: The score labels (H, YO, CH) SHALL be displayed in Gold color (`text-yellow-400` or similar).

### Requirement: Referee Controller Settings
- **Input Type**: The "Country" field SHALL be a dropdown menu (`<select>`) listing country codes.
- **Data Source**: The dropdown SHALL use the same country list as the flag selector but display only text/code.
- **Layout**: The Match Settings panel SHALL handle long input values (names) gracefully without breaking the grid/flex layout.

