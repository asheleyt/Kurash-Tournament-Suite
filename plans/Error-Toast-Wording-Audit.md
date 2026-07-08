# Error Toast Wording Audit

**Generated:** 2026-07-08
**Pattern:** What happened / Why (optional) / What to do

## Summary

| Category | Count |
|----------|-------|
| Total error toasts | 49 |
| ✅ Complete | 22 |
| ⚠️ Partial (needs improvement) | 27 |
| ❌ Missing (needs rewrite) | 0 |

*Note: No messages are completely missing both what and what-to-do; all either explain the problem or hint at a solution, but many lack explicit guidance.*

## Messages Needing Improvement

| # | File | Line | Current Message | Issue | Suggested Fix |
|---|------|------|-----------------|-------|---------------|
| 1 | refereeController.setup.ts | 893 | "Application exit is only available in the desktop controller." | No what-to-do | "Use the desktop controller app to exit the application." |
| 2 | refereeController.setup.ts | 906 | "The desktop app could not be closed." | No what-to-do | "The desktop app could not be closed. Try closing it manually or contact support." |
| 3 | refereeController.setup.ts | 3711 | "Connection test failed." (or error.message) | No what-to-do | "Connection test failed. Check your network connection and Event Host address." |
| 4 | refereeController.setup.ts | 3721 | "Invalid Event Host address." (or error.message) | No what-to-do | "Invalid Event Host address. Verify the address and try again." |
| 5 | refereeController.setup.ts | 3765 | "Failed to refresh sync." (or error.message) | No what-to-do | "Failed to refresh sync. Check your connection and try again." |
| 6 | refereeController.setup.ts | 5424 | "Invalid Event Host address." (or error.message) | No what-to-do | "Invalid Event Host address. Verify the address and try again." |
| 7 | refereeController.setup.ts | 6544 | "This controller is not yet assigned to a ring. {message}" | No what-to-do | "This controller is not yet assigned to a ring. Assign it to a ring in the Event Host." |
| 8 | refereeController.setup.ts | 7321 | "Failed to finish match." (or error.message) | No what-to-do | "Failed to finish match. Check your connection and try again, or contact support." |
| 9 | refereeController.setup.ts | 7474 | "This bout is not confirmed in the saved queue snapshot yet." | No what-to-do | "This bout is not confirmed in the saved queue snapshot yet. Refresh the queue or wait for confirmation." |
| 10 | useRefereeDisplayManagement.ts | 540 | "Failed to read display state." (or error.message) | No what-to-do | "Failed to read display state. Restart the Electron app or check display permissions." |
| 11 | useRefereeDisplayManagement.ts | 551 | "Display controls are only available in the Electron desktop app." | No what-to-do | "Display controls are only available in the Electron desktop app. Switch to the desktop app to manage displays." |
| 12 | useRefereeDisplayManagement.ts | 563 | "Failed to change the public output mode." (or other fallback messages) | No what-to-do | "Failed to change the public output mode. Check display connections and try again." |
| 13–39 | useRefereeDisplayManagement.ts | various | "Failed to ..." fallback messages | No what-to-do | Append: "Check display connections and try again." or "Try again or restart the app." |
| 40 | useRefereeQueueSync.ts | 1208 | "Kurash System: Offline" | No what-to-do | "Kurash System: Offline. Check your network connection and Event Host address." |
| 41 | useRefereeQueueSync.ts | 1215 | "Kurash System: Offline" | No what-to-do | Same as #40. |
| 42 | useRefereeQueueSync.ts | 1248 | "Kurash System fetch failed" (or error.message) | No what-to-do | "Failed to fetch tournaments. Check your connection and try again." |
| 43 | useRefereeQueueSync.ts | 1274 | "Invalid Event Host address." (or error.message) | No what-to-do | "Invalid Event Host address. Verify the address and try again." |
| 44 | useRefereeQueueSync.ts | 1319 | "Failed to restore the live snapshot." (or error.message) | No what-to-do | "Failed to restore the live snapshot. Reconnect to Event Host and try again." |
| 45 | useRefereeControllerSession.ts | 552 | "Assigned setup refresh failed." (or error.message) | No what-to-do | "Assigned setup refresh failed. Reconnect to Event Host and try again." |
| 46 | useRefereeControllerSession.ts | 559 | "Assigned setup refresh failed." (or error.message) | No what-to-do | Same as #45. |
| 47 | useRefereeControllerSession.ts | 680 | "Invalid Event Host address." (or error.message) | No what-to-do | "Invalid Event Host address. Verify the address and try again." |
| 48 | useRefereeControllerSession.ts | 714 | "Pairing failed." (or error.message) | No what-to-do | "Pairing failed. Check your pairing code and Event Host address, then try again." |
| 49 | useRefereeControllerDisplayManagement.ts | 118 | "Failed to prepare the live scoreboard state before changing outputs." (or error.message) | No what-to-do | "Failed to prepare the live scoreboard state. Restart the Electron app or check display permissions." |

## Per-File Audit

### refereeController.setup.ts

| Line | Current Message | Classification | Suggested Improvement |
|------|-----------------|----------------|------------------------|
| 893 | "Application exit is only available in the desktop controller." | ⚠️ Partial | Add: "Use the desktop controller app to exit the application." |
| 906 | "The desktop app could not be closed." | ⚠️ Partial | Add: "Try closing it manually or contact support." |
| 3218 | "This match was updated. Please load the updated match before continuing." | ✅ Complete | – |
| 3711 | "Connection test failed." (or error.message) | ⚠️ Partial | Add: "Check your network connection and Event Host address." |
| 3721 | "Invalid Event Host address." (or error.message) | ⚠️ Partial | Add: "Verify the address and try again." |
| 3765 | "Failed to refresh sync." (or error.message) | ⚠️ Partial | Add: "Check your connection and try again." |
| 5424 | "Invalid Event Host address." (or error.message) | ⚠️ Partial | Add: "Verify the address and try again." |
| 6544 | "This controller is not yet assigned to a ring. {message}" | ⚠️ Partial | Add: "Assign it to a ring in the Event Host." |
| 6588 | "Event Host unreachable. Please check your connection and try again." | ✅ Complete | – |
| 6819 | ROLLBACK_SEQUENCE_CONFLICT_MESSAGE ("Result was not accepted...") | ✅ Complete | – |
| 7321 | "Failed to finish match." (or error.message) | ⚠️ Partial | Add: "Check your connection and try again, or contact support." |
| 7474 | "This bout is not confirmed in the saved queue snapshot yet." | ⚠️ Partial | Add: "Refresh the queue or wait for confirmation." |
| 7487 | "This match was updated. Please load the updated match before continuing." | ✅ Complete | – |

### useRefereeDisplayManagement.ts

| Line | Current Message | Classification | Suggested Improvement |
|------|-----------------|----------------|------------------------|
| 540 | "Failed to read display state." (or error.message) | ⚠️ Partial | Add: "Restart the Electron app or check display permissions." |
| 551 | DISPLAY_UNAVAILABLE_MESSAGE | ⚠️ Partial | Add: "Switch to the desktop app to manage displays." |
| 563 | fallbackMessage (generic "Failed to ...") | ⚠️ Partial | Append: "Check display connections and try again." |
| 591 | "Confirm that Controller Screen should also show the public scoreboard..." | ✅ Complete | – |
| 643 | "Choose one or more scoreboard screens first." | ✅ Complete | – |
| 727 | "Choose one or more Gilam Match Order screens first." | ✅ Complete | – |
| 753 | "Set up the Event Host connection and tournament first..." | ✅ Complete | – |
| 792 | "Enter a profile name first." | ✅ Complete | – |
| 834 | "Choose a saved display setup first." | ✅ Complete | – |

### useRefereeQueueSync.ts

| Line | Current Message | Classification | Suggested Improvement |
|------|-----------------|----------------|------------------------|
| 871 | "Failed to save match list. Please check the Event Host connection." | ✅ Complete | – |
| 1208 | "Kurash System: Offline" | ⚠️ Partial | Add: "Check your network connection and Event Host address." |
| 1248 | "Kurash System fetch failed" | ⚠️ Partial | Change to: "Failed to fetch tournaments. Check your connection and try again." |
| 1274 | "Invalid Event Host address." | ⚠️ Partial | Add: "Verify the address and try again." |
| 1287 | "Reconnect to Event Host first to restore the live snapshot." | ✅ Complete | – |
| 1319 | "Failed to restore the live snapshot." | ⚠️ Partial | Add: "Reconnect to Event Host and try again." |
| 1777 | "Failed to sync the match list. Please check the Event Host connection." | ✅ Complete | – |

### useRefereeControllerSession.ts

| Line | Current Message | Classification | Suggested Improvement |
|------|-----------------|----------------|------------------------|
| 552 | "Assigned setup refresh failed." | ⚠️ Partial | Add: "Reconnect to Event Host and try again." |
| 559 | "Assigned setup refresh failed." | ⚠️ Partial | Same as line 552. |
| 574 | "Saved pairing expired..." | ✅ Complete | – |
| 580 | "Saved pairing no longer matches..." | ✅ Complete | – |
| 586 | "This saved pairing belongs..." | ✅ Complete | – |
| 680 | "Invalid Event Host address." | ⚠️ Partial | Add: "Verify the address and try again." |
| 714 | "Pairing failed." | ⚠️ Partial | Add: "Check your pairing code and Event Host address, then try again." |

### useRefereeControllerDisplayManagement.ts

| Line | Current Message | Classification | Suggested Improvement |
|------|-----------------|----------------|------------------------|
| 118 | "Failed to prepare the live scoreboard state before changing outputs." | ⚠️ Partial | Add: "Restart the Electron app or check display permissions." |

---

*This audit covers all error toasts across the five specified files. All messages at least describe what happened; the majority lack explicit guidance on what the operator should do next. The suggested improvements follow a consistent pattern: append a clear, actionable step (usually "Check X and try again" or "Use Y to resolve").*
