# Enhanced Scoreboard Pop-up and Layout Spec

## Why
The user requested two UI improvements for the Scoreboard:
1.  **Medic Pop-up Theme**: The Medic pop-up should adapt its color based on the player who is receiving medical attention (Green for Player 1/Left, Blue for Player 2/Right), similar to the Winner pop-up.
2.  **Gender/Weight Panel Size**: The "Gender" and "Weight Division" panels in the top header are too narrow and need to be wider for better visibility.

## What Changes
-   **kurashScoreBoard.vue**:
    -   **Medic Pop-up**:
        -   Currently uses a static Red theme (`border-red-500`, `text-red-500`).
        -   Logic needs to check `timerPlayer`:
            -   If `timerPlayer === 'player1'`: Use Green theme (border-[#00ff00], text-[#00ff00], etc.).
            -   If `timerPlayer === 'player2'`: Use Blue theme (border-cyan-400, text-cyan-400, etc.).
            -   Fallback (or if generic): Keep Red or default to Green/Blue. Since medic is player-specific, we should enforce the player check.
    -   **Header Layout**:
        -   The Gender and Weight Division `div`s currently have `min-w-[150px]`.
        -   Increase this minimum width (e.g., `min-w-[250px]` or `w-64`) to make them "more bigger".

## Impact
-   **Medic Pop-up**: Visually indicates *who* is getting medic (Green vs Blue).
-   **Header**: More spacious layout for match info.

## MODIFIED Requirements
### Requirement: Medic Pop-up UI
-   **Theme**: SHALL match the color of the player receiving medic.
    -   Player 1 (Left): Green.
    -   Player 2 (Right): Blue.

### Requirement: Scoreboard Header
-   **Width**: The Gender and Weight Division containers SHALL be significantly wider (approx 2x current size).
