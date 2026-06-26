# Match Settings and Scoreboard Layout Fixes Spec

## Why

The user is experiencing two distinct issues:

1.  **Match Settings Scroll**: The "auto-scroll to top" logic implemented previously is insufficient. The user needs to scroll _even higher_, specifically to reach the "Player Name" input fields which are at the very top of the form. The current scroll limit might be constrained by the container size or offset.
2.  **Scoreboard Layout**: The "Row 2: Scores" container (for Player 1) and "Row 1: Scores" container (for Player 2) are currently using a translucent/dark background (`bg-black/20`). The user wants these specific containers to have opaque colored backgrounds corresponding to their player side (Blue for one, Green for the other) to match the "upper right and left" boxes. _Correction_: The user asked to "fill the boxes from the upper right and left an opaque blue and green accordingly". I already did the "upper" info boxes. Now they might mean the _score_ boxes or the container _holding_ the scores. Let's look at the screenshot or context. The screenshot shows the score container is dark. The user said "fill the boxes from the upper right and left". If I already did the "Player Info" boxes (which are upper left/right), maybe they mean the _Score Row_ container? Or maybe they mean the _Score Buttons themselves_?
    - _Re-reading previous prompt_: "Can you also fill the boxes from the upper right and left an opaque blue and green accordingly and respectively." -> This was my previous task (Visual Tweaks v2), which I implemented on the "Player Info" boxes.
    - _Current Prompt_: "I need this to reach the top, until i reach the user input for player name so you need to automatically direct the user there once the Match Settings is clicked. I can't reach it because the scroll up's limit is not enough."
    - _Wait, the user is talking about the REFEREE controller scroll issue primarily._
    - _Did I miss a request?_ The user input text is ONLY about the scroll issue. "I need this to reach the top...".
    - _Ah, I see._ The user's input text is ONLY about the scroll. The previous prompt was about the colors. I might have misunderstood "upper right and left" in the _previous_ turn if the user is still unsatisfied, but they didn't mention colors in _this_ prompt.
    - _Focus_: The user is complaining about the scroll. "I can't reach it because the scroll up's limit is not enough."
    - _Hypothesis_: The `scrollTo(0)` is working on the _root container_, but maybe the `max-w-7xl` or some inner container is the one scrolling? Or maybe the padding is preventing it from showing the very top? Or maybe the header is fixed/sticky and covering the top inputs?
    - _Observation_: In `refereeController.vue`, the root div has `h-screen` and `overflow-y-auto`. The settings panel is the _first_ child of the inner div. If I scroll to top 0, it should show.
    - _Potential Issue_: Is the "Match Settings" button itself sticky? No.
    - _Potential Issue_: Is the `rootContainer` ref actually attached to the scrolling element? Yes, line 2: `ref="rootContainer" ... :class="... 'overflow-y-auto' ..."`.
    - _Maybe_: The browser needs a `nextTick`? Or maybe the content _above_ the inputs (the "Match Settings" toggle button itself) is taking up space? The user says "until i reach the user input for player name". This implies they want the _inputs_ to be visible, which are inside the expanded panel.
    - _Solution_: When opening settings, we should scroll such that the _inputs_ are in view. Since the inputs are inside the panel which is at the top, scrolling to 0 _should_ work, UNLESS the user wants the _toggle button_ to be scrolled out of view? No, that's unlikely.
    - _More likely_: The `overflow-hidden` vs `overflow-y-auto` toggle is causing layout shifts or the `scrollTo` fires _before_ the DOM expands (Vue `v-show` transition).
    - _Fix_: Use `nextTick` or `setTimeout` to scroll _after_ the panel has expanded.

## What Changes

- **Referee Controller**:
    - **Scroll Logic**: Wrap the scroll command in a `setTimeout` (e.g., 100-300ms) or `nextTick` to ensure the DOM has fully updated and the panel is expanded before scrolling.
    - **Target**: Ensure we are scrolling the correct container.

## Impact

- **Affected code**:
    - `resources/js/Pages/refereeController.vue`

## MODIFIED Requirements

### Requirement: Match Settings Scroll

- **Timing**: The auto-scroll SHALL occur _after_ the settings panel has visibly expanded to ensure the scroll height calculation is correct and the target position is reachable.
- **Position**: The view SHALL scroll to the absolute top (0) of the scrollable container.
