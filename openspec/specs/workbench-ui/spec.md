# workbench-ui Specification

## Purpose
TBD - created by archiving change redesign-workbench-ui-postman-inspired. Update Purpose after archive.
## Requirements
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

### Requirement: Async workbench actions show busy feedback on the affected region only
The system SHALL display a visible busy/loading overlay on the workbench region whose data or controls are temporarily invalidated by an async action, while avoiding a full-application blocker for operations that do not affect the entire app.

#### Scenario: Scoped action affects only one workbench region
- **WHEN** an async user action invalidates only a specific workbench region
- **THEN** the system shows a busy overlay on that region instead of blocking unrelated workbench regions

### Requirement: Workspace refresh actions lock the workspace region while loading
The system SHALL mask the workspace workbench region and prevent interaction inside it while switching workspaces or performing another action that reloads the current workspace state.

#### Scenario: User switches workspaces
- **WHEN** the user changes the active workspace and the app begins reloading workspace data
- **THEN** the system shows a workspace-scoped loading overlay and prevents interaction with the workspace region until the refreshed workspace state is ready

### Requirement: Request sending locks the active request builder region
The system SHALL mask the active request authoring region and prevent editing or repeated actions while a request is being sent.

#### Scenario: User sends the active request
- **WHEN** the user triggers a send action for the active request tab
- **THEN** the request builder region shows a loading overlay and does not allow request editing or repeated request actions until the send flow completes

#### Scenario: Request send finishes or fails
- **WHEN** the active request send flow completes successfully or returns an error
- **THEN** the request builder loading overlay is removed and the request authoring region becomes interactive again

### Requirement: Request body mode selection maps to matching editing surfaces
The system SHALL present a request-body editing surface that matches the selected body mode instead of routing every body mode through one generic text editor.

#### Scenario: User selects a structured body mode
- **WHEN** the active request body mode is changed to `formdata` or `binary`
- **THEN** the request authoring region shows an editing surface that matches that mode rather than a generic text-area-only editor

#### Scenario: User selects a text body mode
- **WHEN** the active request body mode is `json` or `raw`
- **THEN** the request authoring region provides a text-oriented editing surface appropriate for that mode

### Requirement: Response inspection communicates lifecycle state explicitly
The system SHALL distinguish idle, pending, completed, and failed response states in the response inspection region so users can interpret the current result without inferring state from stale content.

#### Scenario: User has not sent the active request yet
- **WHEN** the active request tab has no completed send result
- **THEN** the response inspection region shows an explicit idle state instead of presenting the pane as a successful response

#### Scenario: User sends a request while a previous result is visible
- **WHEN** the user triggers a send for the active request and the response region still contains the prior completed result
- **THEN** the response inspection region shows that a new response is pending and that any retained result content is stale until the new send completes

#### Scenario: Request send returns an error
- **WHEN** the active request send fails with an HTTP or transport error
- **THEN** the response inspection region presents an explicit error-oriented state while preserving access to the relevant response details that are available

### Requirement: Request and response pane collapse behaves as a layout state
The system SHALL treat request-pane and response-pane collapse as layout states with compact summaries and predictable restore behavior, not only as local content toggles.

#### Scenario: User collapses the request pane
- **WHEN** the user collapses the request pane
- **THEN** the workbench shows a compact request summary and reallocates layout space in a predictable way for the remaining visible pane

#### Scenario: User re-expands a collapsed pane
- **WHEN** the user restores a previously collapsed request or response pane
- **THEN** the workbench restores that pane to a predictable usable size instead of leaving it at an arbitrary compressed size

### Requirement: Constrained-width workbench preserves main task continuity across pane states
The system SHALL preserve access to both request authoring and response inspection across supported constrained-width layouts, including when one pane is collapsed and later restored.

#### Scenario: User works in a constrained-width layout
- **WHEN** the workbench is displayed below the desktop threshold
- **THEN** the user can still access both request authoring and response inspection without losing the active editing or response context

#### Scenario: User changes pane state on a constrained width
- **WHEN** the user collapses or restores the request or response pane in a constrained-width layout
- **THEN** the workbench preserves the active request and latest response context instead of resetting the task flow

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

