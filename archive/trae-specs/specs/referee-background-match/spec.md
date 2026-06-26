# Referee Background Color Update Spec

## Why
The user wants to match the "layerbase" (background/base layer) of the `refereeController` to the `kurashScoreBoard`. Currently, they use different background colors.

## What Changes
- Update the root `div` in `refereeController.vue` to use the background color `bg-[#1a1f2e]` (from `kurashScoreBoard`) instead of `bg-[#0f172a]`.

## Impact
- **Affected file**: `resources/js/Pages/refereeController.vue`
- **Visual Consistency**: The referee controller will now share the same dark blue/gray background tone as the main scoreboard.

## MODIFIED Requirements
### Requirement: Background Consistency
The referee controller SHALL use the same background color as the scoreboard.
- **Current**: `bg-[#0f172a]` (Dark Slate)
- **New**: `bg-[#1a1f2e]` (Dark Blue-Gray)
