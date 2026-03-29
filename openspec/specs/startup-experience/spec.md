# startup-experience Specification

## Purpose
Define the launch placeholder, bootstrap handoff, and theme-consistent startup feedback for the desktop application.
## Requirements
### Requirement: Main window shows launch feedback before the app mounts
The system SHALL render a visible startup placeholder in the main application window as soon as the launch document paints so startup never presents a blank white window while the frontend bundles are still loading.

#### Scenario: Window becomes visible before Vue mounts
- **WHEN** the user launches the desktop app and the main window is shown before the Vue app has mounted
- **THEN** the window displays a styled startup placeholder instead of an empty white surface

### Requirement: Startup feedback persists until initial bootstrap completes
The system SHALL transition from the document-level placeholder to an application-owned startup screen after mount and keep startup feedback visible until the initial runtime bootstrap succeeds.

#### Scenario: Bootstrap is still pending after app mount
- **WHEN** the Vue app has mounted but the initial runtime bootstrap is still loading
- **THEN** the app shows a startup loading screen and keeps the main workbench from becoming interactive

#### Scenario: Bootstrap completes successfully
- **WHEN** the initial runtime bootstrap succeeds
- **THEN** the startup experience is removed and the main workbench becomes visible without an empty intermediate frame

### Requirement: Startup failures are communicated and recoverable
The system SHALL present startup failures in the main window and provide a retry path instead of reducing launch failure to a blank or ambiguous state.

#### Scenario: Initial bootstrap fails
- **WHEN** the initial runtime bootstrap returns an error during app startup
- **THEN** the startup screen shows an error state that explains initialization did not complete

#### Scenario: User retries after startup failure
- **WHEN** the user activates the retry action from the startup failure state
- **THEN** the system reruns the bootstrap flow and returns to the startup loading state until the retry succeeds or fails again

### Requirement: Startup theme stays continuous from first paint through bootstrap handoff
The system SHALL resolve the launch document and startup feedback theme from the last saved application theme mode before Vue mounts, and SHALL preserve that resolved theme through bootstrap handoff so startup does not flash an unrelated theme before the workbench becomes ready.

#### Scenario: User relaunches with an explicit saved theme
- **WHEN** the user previously saved `light` or `dark` theme mode and launches the app again
- **THEN** the static launch document, the startup placeholder, and the application-owned startup screen all render with that same resolved theme before the workbench is shown

#### Scenario: User relaunches with system theme mode
- **WHEN** the saved theme mode is `system` and the operating system currently prefers dark or light appearance
- **THEN** the launch document and startup feedback resolve to that current system preference before bootstrap completes

#### Scenario: Runtime bootstrap completes and the startup placeholder exits
- **WHEN** runtime bootstrap has applied settings and the application is ready to hand off from the static startup placeholder
- **THEN** the system removes the static startup placeholder only after the runtime theme is aligned with the resolved startup theme, without showing an intermediate mismatched-theme frame
