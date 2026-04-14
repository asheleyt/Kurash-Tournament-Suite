# Referee Panel Background Update Spec

## Why
The user wants to align the visual style of the referee controller panels with the scoreboard, specifically matching the "shadow-xl background" (likely referring to the glassmorphism style with `shadow-xl` seen in `kurashScoreBoard.vue`). The current gradient background is inconsistent with the desired look.

## What Changes
- Replace the `bg-gradient-to-br from-[#1e293b] to-[#0f172a]` background on all main panels in `refereeController.vue` with a glassmorphism style: `bg-black/20 backdrop-blur-md border border-white/5 shadow-xl`.
- This applies to:
  - Settings Panel
  - Timer Display
  - Timer Controls
  - Game Controls
  - Player Right Controls (and border color tweaks if needed)
  - Player Left Controls (and border color tweaks if needed)

## Impact
- **Affected file**: `resources/js/Pages/refereeController.vue`
- **Visuals**: The panels will now have a semi-transparent dark background with a blur effect, consistent with the scoreboard's design language.

## MODIFIED Requirements
### Requirement: Panel Styling
The referee controller panels SHALL use the "shadow-xl" glassmorphism style instead of the opaque gradient.
- **Current**: `bg-gradient-to-br from-[#1e293b] to-[#0f172a]`
- **New**: `bg-black/20 backdrop-blur-md border border-white/5 shadow-xl`
