# Redesign Winner Popup Spec

## Why
The user wants the winner announcement popup to visually match a specific design reference (screenshot provided). The current implementation is basic. The new design requires a dark background with a colored border (matching the winner), a trophy icon, styled "WINNER" text with sparkles, the winner's name, and a "SCORE N/A" label (or actual score if possible).

## What Changes
- **Redesign Popup Structure**: Update the winner popup markup in `kurashScoreBoard.vue`.
- **Styling**:
  - Dark background with gradient (`from-[#1a1f2e] to-[#020617]` is already close, but we'll refine it to match the "card" look).
  - Colored border based on winner (`border-green-500` or `border-cyan-500`).
  - Trophy Icon: Add a large trophy icon (using `TrophyIconSimple` or similar SVG).
  - "WINNER" Text: Use a gradient text effect with sparkle icons.
  - Player Name: Large, bold, white text.
  - Score Section: Add a "SCORE" label and display "N/A" (as requested) or potentially the winner's score if available.

## Impact
- **Affected Specs**: `scoreboard-fixes-and-ui` (or create new `winner-popup-enhancement`)
- **Affected Code**: `resources/js/pages/kurashScoreBoard.vue`

## MODIFIED Requirements
### Requirement: Winner Popup UI
The winner popup SHALL match the provided design reference:
- **Container**: Dark card with rounded corners and a colored border corresponding to the winner's side (Green/Cyan).
- **Iconography**: A large outline-style trophy icon at the top, colored matching the winner.
- **Typography**:
  - "WINNER" label with decorative sparkles.
  - Winner's Name in large white font.
  - "SCORE" label in small uppercase gray text.
  - "N/A" (or score value) below the label.

#### Scenario: Player 1 Wins
- **WHEN** Player 1 is declared winner
- **THEN** the popup border is Green
- **AND** the trophy icon is Green
- **AND** the "WINNER" text is Green

#### Scenario: Player 2 Wins
- **WHEN** Player 2 is declared winner
- **THEN** the popup border is Cyan
- **AND** the trophy icon is Cyan
- **AND** the "WINNER" text is Cyan
