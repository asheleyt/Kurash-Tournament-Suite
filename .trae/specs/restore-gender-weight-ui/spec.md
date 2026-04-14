# Restore Gender/Weight UI Spec

## Why
The user wants to restore the original visual style of the "Gender" and "Weight Division" labels (which were previously large, styled boxes) but acknowledges the large timer occupies the center space.
Instead of placing them below the timer (where they were lost/minimized), they should be positioned to the **left and right** of the timer, creating a balanced header layout.

## What Changes
- **Scoreboard Header Layout**:
    - Current: `[Medic Green] [Timer] [Medic Blue]` with small text for Gender/Weight below.
    - New: `[Gender/Weight Panel] [Timer] [Gender/Weight Panel]`?
    - *Correction based on user input*: "put them to left and right of the timer accordingly".
    - The Medic panels also exist there. We need to integrate them.
    - Proposed Layout: `[Medic P1] [Gender Panel] [Timer] [Weight Panel] [Medic P2]` OR `[Gender] [Medic P1] [Timer] [Medic P2] [Weight]`.
    - Given the space, a symmetric layout like `[Gender Box] [Timer] [Weight Box]` is likely what the user means by "left and right". The Medic panels might need to be adjacent or above/below these boxes, or the Gender/Weight boxes *replace* the Medic position?
    - *Interpretation*: The Medic panels are relatively small. The Gender/Weight boxes were large.
    - **Plan**:
        - Left Side: Gender Panel (Styled Box)
        - Center: Timer
        - Right Side: Weight Panel (Styled Box)
        - *Medic Panels*: Position them above the Gender/Weight boxes or integrate them. Let's place them at the very far edges or above the boxes to avoid clutter.

## Impact
- **Affected code**:
    - `resources/js/Pages/kurashScoreBoard.vue`

## MODIFIED Requirements

### Requirement: Gender & Weight Display
- **Style**: Restore the "Box" styling (Background, Border, Label, Large Value).
- **Position**:
    - **Gender**: To the LEFT of the Timer.
    - **Weight**: To the RIGHT of the Timer.
- **Layout**: The Header SHALL contain: `[Gender Box] [Timer] [Weight Box]`.

### Requirement: Medic Display Integration
- **Position**: The Medic panels (Label + 2 Boxes) SHALL remain visible.
- **Placement**: Place them above the Gender/Weight boxes or to the far left/right to ensure they don't conflict. *Decision*: Place them above the Gender/Weight boxes for a clean "Dashboard" look.

