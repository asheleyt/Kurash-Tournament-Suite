# Tasks

- [x] Task 1: Refactor Reset Logic
  - [x] SubTask 1.1: Extract the core logic from `handleResetTime` into a new function `confirmResetTime` that does not include the `confirm()` check.
  - [x] SubTask 1.2: Extract the core logic from `handleResetAll` into a new function `confirmResetAll` that does not include the `confirm()` check.

- [x] Task 2: Implement Dialog Components
  - [x] SubTask 2.1: Import necessary Dialog components (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`) and `Button` component in `refereeController.vue`.
  - [x] SubTask 2.2: Wrap the "Reset Timer" button with the `Dialog` component structure, using the extracted `confirmResetTime` function for the confirmation action.
  - [x] SubTask 2.3: Wrap the "Reset All" button with the `Dialog` component structure, using the extracted `confirmResetAll` function for the confirmation action.
  - [x] SubTask 2.4: Ensure the dialogs have appropriate titles, descriptions, and "Cancel"/"Confirm" buttons.

- [x] Task 3: Verify and Cleanup
  - [x] SubTask 3.1: Verify that clicking "Reset Timer" opens the dialog and confirming resets the timer.
  - [x] SubTask 3.2: Verify that clicking "Reset All" opens the dialog and confirming resets the entire match.
  - [x] SubTask 3.3: Verify that cancelling the dialogs does not perform any action.
  - [x] SubTask 3.4: Remove any unused imports or code related to the old implementation.
