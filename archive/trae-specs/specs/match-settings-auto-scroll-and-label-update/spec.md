# Match Settings Panel Auto-Scroll & Label Update Spec

## Why
The user requests improvements to the Match Settings user experience:
1.  **Auto-Scroll**: When the settings panel is opened, the view should automatically scroll to the top to ensure the settings are immediately visible, rather than opening "in the middle" of the interface.
2.  **Label Clarity**: The "ENTER (Broadcast Changes)" button label is confusing or too technical. It should be renamed to "Save Input" to better reflect its function from a user's perspective.

## What Changes
- **Referee Controller**:
    - **Scroll Behavior**: Add a watcher or event handler that triggers `window.scrollTo({ top: 0, behavior: 'smooth' })` (or similar logic on the root container) whenever `isSettingsOpen` becomes `true`.
    - **Button Label**: Update the text of the "ENTER" button inside the Match Settings panel to "Save Input".

## Impact
- **Affected code**:
    - `resources/js/Pages/refereeController.vue`

## MODIFIED Requirements

### Requirement: Settings Navigation
- **Auto-Scroll**: When "Match Settings" is toggled open, the view SHALL automatically scroll to the top of the page.

### Requirement: UI Text
- **Save Button**: The button previously labeled "ENTER (Broadcast Changes)" SHALL now be labeled "Save Input" (with the sub-label removed or updated if necessary, though "Save Input" implies the action). *Decision: Replace the entire button content with "Save Input" or "Save Input" and a smaller "Broadcast" hint if valuable, but user asked for "Save Input".*

