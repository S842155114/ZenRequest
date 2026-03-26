## ADDED Requirements

### Requirement: Frontend shell uses one coherent API-client workbench hierarchy
The system SHALL present the primary desktop frontend as a unified API-client workbench with clearly separated navigation/explorer, request authoring, and response inspection regions so users can browse, edit, and inspect without losing context.

#### Scenario: Workbench opens on desktop width
- **WHEN** the user opens the app in a standard desktop-width window
- **THEN** the shell shows persistent workbench regions for navigation/explorer, request authoring, and response inspection at the same time

### Requirement: Frontend visual language aligns across primary and supporting surfaces
The system SHALL apply one consistent Postman-inspired visual hierarchy across the main workbench and supporting frontend surfaces including dialogs, menus, and utility controls.

#### Scenario: User opens a supporting UI surface
- **WHEN** the user opens a dialog, menu, or supporting control surface from the frontend shell
- **THEN** the surface uses the same visual system and interaction hierarchy as the rest of the workbench instead of appearing as an unrelated local style

### Requirement: Explorer surface supports dense request browsing
The system SHALL provide a compact explorer surface for workspace context, collection browsing, history access, search/filter actions, and request creation actions without forcing the user to leave the main workbench.

#### Scenario: User browses saved requests
- **WHEN** the user opens the explorer surface
- **THEN** the system shows workspace-aware browsing controls, request collections, history access, and request creation actions in the same shell region

### Requirement: Request authoring controls remain visually primary
The system SHALL keep method selection, request URL editing, send action, and request detail sections visually prominent within the workbench so the active request remains the focal task.

#### Scenario: Active request is being edited
- **WHEN** the user focuses on the active request tab
- **THEN** the shell emphasizes the method, URL, send action, and request detail sections over surrounding navigation chrome

### Requirement: Constrained widths use temporary secondary panels
The system SHALL adapt the workbench for constrained window widths by converting secondary navigation/explorer surfaces into temporary overlay or drawer-style panels while keeping request authoring and response inspection accessible.

#### Scenario: Window narrows below the desktop shell threshold
- **WHEN** the app is displayed in a constrained-width window
- **THEN** the system replaces persistent secondary navigation/explorer regions with temporary panels instead of compressing all workbench panes into unusable widths

### Requirement: Shell navigation changes preserve active editing context
The system SHALL preserve the active workspace context, active request tab, and current response view when users open, close, or switch workbench navigation surfaces.

#### Scenario: User toggles explorer visibility
- **WHEN** the user opens or closes an explorer or drawer surface
- **THEN** the active request editing context and response inspection context remain available without being reset

### Requirement: Visible frontend copy is sourced from i18n
The system SHALL source visible frontend labels, actions, helper text, and dialog copy from the project's i18n message layer rather than hard-coded strings inside Vue component templates.

#### Scenario: User switches application language
- **WHEN** the user changes the application language
- **THEN** the visible frontend shell and supporting UI copy update through the i18n message system without relying on component-local hard-coded text
