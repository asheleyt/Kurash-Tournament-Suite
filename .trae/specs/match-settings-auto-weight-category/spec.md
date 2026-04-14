# Auto-Suggest Weight Division Spec

## Why
Currently, the referee must manually enter the weight division. The user wants to streamline this by allowing the referee to enter the players' actual weights (e.g., "79.5 kg" and "80.2 kg") and having the system automatically determine and set the correct weight division (e.g., "-81 kg") based on official Kurash weight categories. This reduces manual effort and potential errors.

## What Changes
-   **refereeController.vue**:
    -   Add `handleWeightInput` logic.
    -   Define standard IKA Weight Categories for Men and Women.
    -   Watch for changes in `player1.weight` and `player2.weight` (and `gender`).
    -   Algorithm:
        -   Parse input weights (handle "kg" suffix, commas/decimals).
        -   Find the smallest category that fits the *heaviest* of the two players.
        -   Update `gameState.weightDivision` (we need to ensure this field exists or use a new one, currently `weight` is per player, but there is usually a match category).
        -   *Correction*: Looking at the code, `gameState` doesn't have a top-level `weightDivision` property visible in the `GameState` interface, but `kurashScoreBoard.vue` receives `weightDivision` derived from `player1.weight`. Wait, the scoreboard uses `weightDivision.value = e.player1.weight || 'N/A'`.
        -   *Clarification*: The current app seems to use `player1.weight` as the de-facto match weight division string in the scoreboard header.
        -   **New Requirement**: We should probably add a dedicated `category` or `weightDivision` to `GameState` to be explicit, OR just auto-fill the `player1.weight` and `player2.weight` inputs?
        -   *User Intent*: "The system automatically sets the **division**".
        -   **Approach**: We will add a new field `matchCategory` to `GameState` (and UI) that represents the official division.
        -   When referee types "79.5" in P1 Weight and "80.2" in P2 Weight:
            -   System calculates "-81 kg".
            -   System populates a new "Match Category" field (or updates the existing per-player weight fields if that's what the user meant, but "division" implies a single match-wide setting).
            -   *Refined Approach*: Since the Scoreboard displays a single "WEIGHT DIVISION" box (currently mapped to `player1.weight` in the listener), we should ideally have a single source of truth.
            -   **Plan**:
                1.  Add `category` to `GameState`.
                2.  Add a "Match Weight Category" display/input in the Referee Settings (auto-calculated but editable).
                3.  Update Scoreboard to prefer `category` over `player1.weight`.

## Impact
-   **Referee Controller**: New auto-calculation logic and a new "Match Category" field.
-   **Scoreboard**: Will display the official category (e.g., "-81 kg") instead of just whatever text was typed in Player 1's weight box.

## ADDED Requirements
### Requirement: Weight Category Auto-Calculation
-   **Logic**:
    -   Men: -60, -66, -73, -81, -90, -100, +100 kg.
    -   Women: -48, -52, -57, -63, -70, -78, -87, +87 kg.
-   **Trigger**: Updates whenever Player 1 or Player 2 weight inputs change, OR when Gender changes.
-   **Behavior**:
    -   Take max(p1_weight, p2_weight).
    -   Find corresponding bracket.
    -   Set `gameState.category`.

### Requirement: Match Category Field
-   **UI**: A new read-only (or editable) field in Match Settings showing the calculated category.

## MODIFIED Requirements
### Requirement: Scoreboard Weight Display
-   **Source**: SHALL display `gameState.category` if available.
