## MODIFIED Requirements

### Requirement: Dirty request tabs require an explicit close decision
The system SHALL require an explicit save-or-discard decision before closing a request tab that contains unsaved work so users do not lose in-progress edits by triggering a generic tab close action, and the close-confirmation dialog SHALL present cancel, don't-save, and save-and-close actions with a clear request-workbench visual hierarchy.

#### Scenario: User attempts to close a dirty request tab
- **WHEN** the user closes a request tab whose work is unsaved or detached from a saved resource
- **THEN** the system keeps the tab open and presents a request-themed confirmation dialog that surfaces unsaved-request context cues and clearly distinguishes cancel, don't-save, and save-and-close actions

#### Scenario: User saves from the dirty-close confirmation
- **WHEN** the user chooses to save from the dirty-close confirmation and completes the save flow successfully
- **THEN** the system persists the request and closes the original tab after the save completes
