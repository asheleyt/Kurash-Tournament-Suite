# Optimize Referee Controller Layout Spec

## Why
The user reported excessive whitespace on the left and right sides of the `refereeController` screen. This suggests the container's `max-width` is too restrictive for larger screens, or the layout isn't utilizing the available width effectively.

## What Changes
- Update the main container's `max-w-7xl` class to `max-w-full` or a larger breakpoint to allow it to expand.
- Adjust padding (`p-4`) if necessary to ensure content isn't too close to the edges but uses more screen real estate.
- Verify grid layouts (`grid-cols-2`) adapt well to the increased width.

## Impact
- **Affected Specs**: `referee-controller`
- **Affected Code**: `resources/js/pages/refereeController.vue`

## MODIFIED Requirements
### Requirement: Layout Responsiveness
The referee controller interface SHALL utilize the available screen width more effectively, reducing unused whitespace on the sides.

#### Scenario: Large Screen View
- **WHEN** viewed on a wide screen (>1280px)
- **THEN** the interface content SHALL expand to fill more of the horizontal space
- **AND** the "excessive" side margins SHALL be reduced
