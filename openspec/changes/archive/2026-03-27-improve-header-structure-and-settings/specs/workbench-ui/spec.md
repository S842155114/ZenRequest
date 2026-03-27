## ADDED Requirements

### Requirement: Header shell separates brand, context, and utility controls
The system SHALL present the top workbench header as distinct brand/navigation, context-switching, and utility zones so users can identify shell identity, active workbench context, and global utilities without scanning one undifferentiated toolbar.

#### Scenario: User views the workbench header on desktop width
- **WHEN** the user views the main workbench shell in a standard desktop-width window
- **THEN** the header shows separate visual regions for brand/navigation, workspace-and-environment context controls, and utility actions

### Requirement: Header keeps workspace and environment context visible across supported widths
The system SHALL keep both the active workspace control and the active environment control visible from the header across supported desktop, medium, and compact layouts, using progressively denser presentation instead of removing either control at narrower widths.

#### Scenario: User narrows the application window
- **WHEN** the app transitions from desktop width to a narrower supported layout
- **THEN** the header compresses workspace and environment controls instead of hiding either one completely

### Requirement: Header settings consolidate language and theme controls
The system SHALL expose language and theme controls through the header settings entry instead of rendering them as separate primary controls in the top header row.

#### Scenario: User opens header settings
- **WHEN** the user opens the top-level header settings entry
- **THEN** the system provides access to application language and theme controls from that settings surface

### Requirement: Header environment control shows lightweight runtime context metadata
The system SHALL show lightweight runtime metadata with the active environment selection so users can see that the selected environment affects request resolution and sending.

#### Scenario: Active environment has enabled variables
- **WHEN** the active environment contains enabled variables
- **THEN** the header environment control shows lightweight metadata derived from that environment, such as the enabled variable count

#### Scenario: User opens environment selection
- **WHEN** the user opens the environment selection surface from the header
- **THEN** each environment option includes lightweight metadata that helps distinguish its runtime context

### Requirement: Header interaction locking remains scoped to the affected shell context
The system SHALL keep unrelated header zones interactive during async operations and SHALL disable only the header controls whose underlying context is temporarily invalidated.

#### Scenario: User sends a request
- **WHEN** the user triggers a request send for the active request tab
- **THEN** the header remains interactive and is not masked as part of the request-builder loading state

#### Scenario: User switches workspaces
- **WHEN** the user changes the active workspace and the app begins reloading workspace state
- **THEN** the header disables the workspace and environment context controls while leaving brand/navigation and settings access available
