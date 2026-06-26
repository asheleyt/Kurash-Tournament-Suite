# Medic Counter and UI Refinements Spec

## Why
The user requests specific visual changes to the scoreboard:
1.  **Medic Counter**: The Medic status indicators (currently outlines) need to be filled with opaque colors.
    *   **Player Left (Green)**: The medic boxes (upper left) should be opaque green.
    *   **Player Right (Blue)**: The medic boxes (upper right) should be opaque blue.
    *   *Correction*: The prompt says "fill this an opaque green (the set from the left) and blue (the set from the right) accordingly".
    *   *Wait*: The screenshot shows RED medic boxes. The prompt says "fill this an opaque green... and blue...". This implies the user wants the MEDIC indicators to match the player color, NOT be red?
    *   *Or*: Does the user mean the *Score* boxes? "fill this" + "undo the green and blue background from the Player left and right's panels".
    *   *Interpretation*:
        *   **Action 1**: Fill "this" (likely referring to the Medic boxes shown in the screenshot, or maybe the score boxes?) -> "opaque green (left) and blue (right)". Given the screenshot is of the Medic boxes, but they are red... and the user says "fill this...". If they mean the Medic boxes, they want them Green/Blue instead of Red? Or maybe they mean the *Score Row Backgrounds* which I didn't change yet?
        *   *Context*: "And can you also undo the green and blue background from the Player left and right's panels in the kurashScoreBoard." -> This refers to my *previous* change where I made the *Player Info* boxes (Name/Flag) opaque Green/Blue. The user wants that *undone* (reverted to transparent/dark).
        *   *Deduction*: If they want the Player Info boxes reverted, but want "fill this" (opaque green/blue), what is "this"?
        *   *Hypothesis 1*: They mean the **Score Row Container** (the big box holding the numbers). Currently `bg-black/20`.
        *   *Hypothesis 2*: They mean the **Medic Boxes** (as per the screenshot). If so, they want Medic boxes to be Green/Blue.
        *   *Hypothesis 3*: They mean the **Score Buttons themselves** (0, 0, 0).
        *   *Most Likely*: The user provided a screenshot of **MEDIC BOXES**. They are currently red outlines. The user says "fill this an opaque green... and blue". So, **Medic Boxes** should be filled opaque Green (Left) and Blue (Right).
        *   *Revert*: Revert the *Player Info* panels to their previous style (likely `bg-white/10` or similar).

## What Changes
- **Scoreboard (kurashScoreBoard.vue)**:
    - **Revert**: Change Player 1 and Player 2 Info Box backgrounds back to `bg-white/10 backdrop-blur-md` (or similar) from the opaque colors.
    - **Medic Boxes (Player 1 / Left)**:
        - Change default/empty state to opaque GREEN (e.g., `bg-green-900` or `bg-green-600/30`?). "fill this an opaque green". This implies the *boxes themselves* should be green.
        - *Wait*: Medic boxes usually indicate *usage*. If they are "filled", does that mean they look "used"? Or just the background color of the empty box?
        - *Interpretation*: The user likely wants the *indicators* to be colored according to the player side, not red.
        - *Active State*: When used, they should probably be bright/filled.
        - *Empty State*: Maybe dark green/blue?
        - *Strict reading*: "fill this an opaque green". I will make the *active* state opaque Green/Blue, and the *inactive* state a darker/transparent version of that color? Or maybe the boxes are *always* filled?
        - *Refined Plan*: The current Medic boxes are red borders. I will change them to:
            - **Player 1**: Border Green, Fill Green (when active).
            - **Player 2**: Border Blue, Fill Blue (when active).
            - *Actually*: "fill this an opaque green". Maybe they mean the background of the box container? No, likely the indicator squares.
            - I will make the Medic squares Green (Left) and Blue (Right).

## Impact
- **Affected code**:
    - `resources/js/Pages/kurashScoreBoard.vue`

## MODIFIED Requirements

### Requirement: Player Info Panels
- **Style Revert**: The Player Name/Country panels SHALL be reverted to `bg-white/10` (or original transparent style) instead of opaque colors.

### Requirement: Medic Indicators
- **Player 1 (Left)**: Medic boxes SHALL use GREEN styling (Border Green, Fill Green when active) instead of Red.
- **Player 2 (Right)**: Medic boxes SHALL use BLUE styling (Border Blue, Fill Blue when active) instead of Red.
- **Fill**: The user requested "fill this an opaque [color]". This might mean the boxes should have a background color even when empty? Or just that the "indicator" is filled? I will assume they want the *active* state to be the opaque fill, and the border to match the player color.

