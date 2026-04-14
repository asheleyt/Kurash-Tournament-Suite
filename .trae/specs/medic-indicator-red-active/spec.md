# Medic Indicator Red Active Spec

## Why
The user wants the medic indicators ("boxes") on the scoreboard to turn red when the medic timer is active for a specific player, providing a clear visual cue of which player is receiving medical attention.

## What Changes
- **kurashScoreBoard.vue**:
  - Update the class binding logic for Player 1 and Player 2 medic indicators.
  - Check if `isMedicMode` is true AND `timerPlayer` matches the respective player.
  - If matched, override the standard color (Green for P1, Blue for P2) with **Red** (`border-red-600`, `bg-red-600`, `shadow-red-...`).
  - Ensure the "filled" state (based on `medicClicks` count) also respects this color change (i.e., if filled, fill with Red; if empty, border is Red).

## Impact
- **Scoreboard UI**: Medic boxes will dynamically change color during medic events, visible even through the medic overlay.
