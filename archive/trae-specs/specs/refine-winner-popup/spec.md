# Spec: Refine Winner Popup

## Status
- [x] Initial Request
- [x] Implementation (Size & Content)
- [ ] Visual Enhancements (Background Effects)

## Requirements
1. **Size Adjustment**:
   - Change popup container dimensions to `w-[92%] h-[92%]`.
   - Ensure consistency with Break Time and Medic overlays.

2. **Content Updates**:
   - Remove "SCORE" section.
   - Add Player Flag image.
   - Add Player Country Code.

3. **Visual Enhancements**:
   - Add a moving "shining wave" or shimmer effect to the background.
   - Effect should be subtle but noticeable, enhancing the celebration feel.
   - Use player colors (Green/Cyan) or a neutral shine.

## Implementation Details
- File: `resources/js/pages/kurashScoreBoard.vue`
- State: Use `winner` object.
- Styling:
  - Add a new absolute layer for the wave effect.
  - Use CSS `@keyframes` for continuous movement.
  - Gradient: `linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)`.
  - Animation: `move-shine 3s infinite linear`.

## Verification
- [x] Code updated in `kurashScoreBoard.vue`.
- [ ] Visual check: Animation runs smoothly and looks "fancy".
