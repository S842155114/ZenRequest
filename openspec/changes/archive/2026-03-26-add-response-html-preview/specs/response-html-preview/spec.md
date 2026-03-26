## ADDED Requirements

### Requirement: HTML responses expose a preview mode in the response body
The system SHALL expose an HTML preview mode when the active response body resolves to HTML content, while keeping the existing response body tab as the entry point for inspection.

#### Scenario: HTML response enables preview mode
- **WHEN** the active response body is detected as HTML from its content type or payload shape
- **THEN** the response body view shows a preview-mode affordance alongside the existing source inspection controls

#### Scenario: Non-HTML response stays on source-only inspection
- **WHEN** the active response body resolves to JSON, XML, plain text, or an unknown non-HTML format
- **THEN** the response body view does not show the HTML preview affordance

### Requirement: Users can switch between HTML source and rendered preview
The system SHALL let users switch between the existing source-oriented body view and a rendered HTML preview without leaving the response body tab.

#### Scenario: User opens rendered preview
- **WHEN** the user selects preview mode for an HTML response
- **THEN** the response body area renders the current HTML payload as a page preview

#### Scenario: User returns to source mode
- **WHEN** the user switches from preview mode back to source mode
- **THEN** the response body area shows the existing formatted body viewer for the same response payload

### Requirement: HTML previews stay isolated from the application shell
The system SHALL render HTML previews in an isolated embedded document so response markup is previewed without becoming part of the main application DOM.

#### Scenario: HTML preview renders inside an isolated surface
- **WHEN** an HTML response is shown in preview mode
- **THEN** the rendered page is displayed inside a dedicated embedded preview surface within the response panel

#### Scenario: Active response changes while preview mode is visible
- **WHEN** the active response content changes while the response body view is open
- **THEN** the preview surface updates to the latest HTML payload or falls back to source-only inspection if the new payload is not HTML
