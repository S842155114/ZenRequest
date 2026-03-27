## ADDED Requirements

### Requirement: Resource context menus open only from supported workbench resource surfaces
The system SHALL open application-level context menus only when the right-click target is a supported workbench resource surface such as a collection header, saved request row, or request tab.

#### Scenario: User right-clicks a supported sidebar or tab resource
- **WHEN** the user right-clicks a collection header, saved request row, or request tab
- **THEN** the system opens a context menu whose actions apply to that targeted resource

#### Scenario: User right-clicks a non-resource workbench surface
- **WHEN** the user right-clicks an empty layout area, panel chrome, or another unsupported workbench surface
- **THEN** the system does not open an application-level resource context menu

### Requirement: Resource context menus do not force active-context changes before action selection
The system SHALL keep the current active request and workbench context unchanged when opening a resource context menu for a non-active resource.

#### Scenario: User right-clicks a non-active request tab
- **WHEN** the user opens a context menu on a request tab that is not currently active
- **THEN** the context menu targets that tab without switching the active tab before the user selects an action

#### Scenario: User right-clicks a non-selected saved request row
- **WHEN** the user opens a context menu on a saved request row that is not currently open or selected
- **THEN** the system keeps the current editor context unchanged until the user chooses a menu action

### Requirement: Editable controls preserve native context-menu behavior
The system SHALL preserve native context-menu behavior for editable controls instead of replacing it with resource-level application actions.

#### Scenario: User right-clicks an editable request control
- **WHEN** the user right-clicks inside a request URL field, text input, textarea, or editor surface
- **THEN** the system does not open a resource context menu and allows the native editing context menu to remain available
