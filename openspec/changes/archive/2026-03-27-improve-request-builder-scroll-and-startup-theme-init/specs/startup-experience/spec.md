## ADDED Requirements

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
