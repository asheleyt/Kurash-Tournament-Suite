# Add Keybindings Spec

## Why
Referees often need to react quickly during a match. Relying solely on mouse clicks can be slow and prone to errors (misclicks). Adding keyboard shortcuts will allow for faster, more tactile control of the game state, improving the referee's efficiency.

## What Changes
- Implement a global keydown listener in `refereeController.vue`.
- Map specific keys to game actions (Scoring, Penalties, Timer, etc.).
- Add a "Keyboard Shortcuts" help modal or tooltip to inform users of the bindings.

## Impact
- **Affected specs**: None.
- **Affected code**: `resources/js/Pages/refereeController.vue`.

## ADDED Requirements
### Requirement: Keybinding Map
The system SHALL support the following default keybindings:

**Global Controls**
- `Space`: Start/Pause Timer
- `Backspace`: Undo last action
- `B`: Toggle Break Mode
- `J`: Toggle Jazo
- `Shift + R`: Reset Timer (with confirmation)
- `Shift + Esc`: Reset Match (with confirmation)

**Player Left (Green) Controls**
- `1`: Score **Halal (H)**
- `2`: Score **Yonbosh (YO)**
- `3`: Score **Chui (CH)**
- `Q`: Penalty **Girrom (G)**
- `W`: Penalty **Dakki (D)**
- `E`: Penalty **Tanbeh (T)**
- `A`: Medic Timer
- `Z`: Declare Winner

**Player Right (Cyan) Controls**
- `0`: Score **Halal (H)**
- `9`: Score **Yonbosh (YO)**
- `8`: Score **Chui (CH)**
- `P`: Penalty **Girrom (G)**
- `O`: Penalty **Dakki (D)**
- `I`: Penalty **Tanbeh (T)**
- `L`: Medic Timer
- `M`: Declare Winner

### Requirement: Safety
- Shortcuts SHALL be disabled when the "Match Settings" panel is open (to avoid typing in input fields triggering actions).
- Critical actions (Reset) SHALL require a modifier key (Shift).

### Requirement: Visual Feedback
- **Optional**: Button press animation when triggered via keyboard.
- **Optional**: "Press [Key]" tooltip on buttons.
