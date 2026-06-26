# Tasks

- [x] Task 1: Improve Auto-Scroll Timing
    - [x] SubTask 1.1: In `refereeController.vue`, import `nextTick` from vue.
    - [x] SubTask 1.2: Modify the `watch(isSettingsOpen)` handler.
    - [x] SubTask 1.3: Wrap the scroll logic in `nextTick(() => { ... })` OR `setTimeout(() => { ... }, 100)`. _Decision_: Use `setTimeout` with a small delay (e.g., 50ms) to be safe against animation frames/rendering delays, as `nextTick` might be too fast if there's a CSS transition on height. Since `v-show` is immediate but the layout shift might take a frame, `setTimeout` is safer.

- [x] Task 2: Verify Scroll Target
    - [x] SubTask 2.1: Double check that `rootContainer` refers to the element with `overflow-y-auto`. (Yes, it does based on previous reads).
    - [x] SubTask 2.2: Ensure `scrollTop = 0` is the correct property.

# Task Dependencies

- Tasks are independent.
