## MODIFIED Requirements

### Requirement: HTML previews stay isolated from the application shell
The system SHALL render HTML previews in an isolated embedded document so response markup is previewed without becoming part of the main application DOM, and SHALL preserve browser-native keyboard ownership for the embedded preview instead of letting shell-level shortcut handling override it.

#### Scenario: HTML preview renders inside an isolated surface
- **WHEN** an HTML response is shown in preview mode
- **THEN** the rendered page is displayed inside a dedicated embedded preview surface within the response panel

#### Scenario: Active response changes while preview mode is visible
- **WHEN** the active response content changes while the response body view is open
- **THEN** the preview surface updates to the latest HTML payload or falls back to source-only inspection if the new payload is not HTML

#### Scenario: HTML preview keeps embedded keyboard behavior
- **WHEN** the user is interacting with the HTML preview iframe
- **THEN** outer workbench keyboard shortcuts do not override iframe-owned browser behavior
- **AND** page-level selection semantics are not forced into the embedded preview surface
