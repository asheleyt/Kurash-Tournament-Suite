# Scoreboard Player Row Background Spec

## Why

The user requests a visual update to the scoreboard where the row containing the player's name, scores, and flag has a black opaque background to improve contrast and grouping. This needs to be applied to both players.

## What Changes

- **UI Update**: Add a black opaque background (`bg-black/40` or similar) behind the row of elements for Player 1.
- **UI Update**: Add the same black opaque background behind the row of elements for Player 2.
- **Constraint**: Ensure this "row background" sits behind the individual element backgrounds (glassmorphism) without breaking the existing grid layout.

## Impact

- **Affected code**: `resources/js/Pages/kurashScoreBoard.vue`

## MODIFIED Requirements

### Requirement: Player Row Styling

- **Visual**: The row containing Player Name/Country, Scores (H, YO, CH), and Flag SHALL have a visible black opaque background layer.
- **Consistency**: This style SHALL be applied identically to both Player 1 and Player 2 rows.
