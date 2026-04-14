# Weight Logic Documentation Spec

## Why
The user requested an explanation of how the system reaches the weight division conclusion. This logic is currently embedded in the code but not explicitly documented in the project documentation. Adding this to the documentation ensures clarity for future developers and stakeholders.

## What Changes
- Update `README.md` to include a section on "Weight Category Logic".
- Document the specific weight classes for Male and Female categories.
- Explain that the category is determined by the **maximum** weight between the two players (to ensure the match fits the heavier player's category).

## Impact
- **Affected Specs**: None directly.
- **Affected Code**: `README.md`.

## ADDED Requirements
### Requirement: Weight Category Documentation
The `README.md` SHALL contain a clear explanation of the weight categorization algorithm.

#### Scenario: User reads documentation
- **WHEN** a user checks the `README.md`
- **THEN** they can see the exact weight ranges for Male and Female divisions.

## MODIFIED Requirements
### Requirement: README Content
The existing `README.md` will be appended with the new section.

## REMOVED Requirements
None.
