# workbench-ui Specification

## Purpose
Define the desktop and compact workbench shell as a coherent professional console for local API engineering, including its visual hierarchy, connected panel structure, and supporting interaction surfaces.
## Requirements
### Requirement: Frontend shell uses one coherent API-client workbench hierarchy
The system SHALL present the primary desktop frontend as a unified API-client workbench with clearly separated navigation/explorer, request authoring, and response inspection regions so users can browse, edit, and inspect without losing context.

#### Scenario: Workbench opens on desktop width
- **WHEN** the user opens the app in a standard desktop-width window
- **THEN** the shell shows persistent workbench regions for navigation/explorer, request authoring, and response inspection at the same time

### Requirement: Frontend visual language aligns across primary and supporting surfaces
The system SHALL apply one consistent professional-console visual hierarchy across the main workbench and supporting frontend surfaces so the product reads as a precise local API engineering tool instead of a generic productivity shell.

#### Scenario: User opens the workbench on desktop width
- **WHEN** the user opens the main workbench shell in a standard desktop-width window
- **THEN** the primary surfaces use a shared professional-console visual language built from disciplined neutral materials, restrained brand emphasis, and consistent interaction feedback

#### Scenario: User opens a supporting UI surface
- **WHEN** the user opens a dialog, menu, sheet, dropdown, or context menu from the frontend shell
- **THEN** the surface uses the same visual system, control hierarchy, and state language as the rest of the workbench instead of appearing like an unrelated local style

### Requirement: Explorer surface supports dense request browsing
The system SHALL present the explorer surface as an activity-aware resource browser with clear hierarchy, active-state emphasis, collection/request identity, and shared workbench activity signals so users can scan saved assets and current work-in-progress without losing context.

#### Scenario: User browses saved requests
- **WHEN** the user opens the explorer surface
- **THEN** the system shows collections, requests, history, search, and creation controls with visual treatment that emphasizes hierarchy, scanability, current selection, and current workbench activity instead of a flat list of generic controls

#### Scenario: User has open or dirty workbench items
- **WHEN** one or more saved requests are already open, unsaved, sending, or restored from history
- **THEN** the explorer surface projects those high-value states onto the relevant resource rows without forcing the user to enter the request pane to understand what is active

### Requirement: Request authoring controls remain visually primary
The system SHALL present the request authoring surface as the main command workspace with explicit request identity, request-local actions, and send readiness so users can understand what object they are editing before they trigger execution or save changes, without duplicating the same identity layer across adjacent header surfaces.

#### Scenario: Active request is being edited
- **WHEN** the user focuses on the active request tab
- **THEN** the request builder reads as the primary construction surface with visible request identity, save state, and send readiness while method selection, URL editing, send actions, and request detail tools remain the most visually actionable elements

#### Scenario: Expanded request pane shows active request identity
- **WHEN** the request pane is expanded and the active request tab is visible above the compose surface
- **THEN** the compose layout presents one dominant request-identity surface instead of repeating the same request title and identity content in both the panel header and the command bar

#### Scenario: User opens many request tabs while composing
- **WHEN** the expanded request pane contains multiple request tabs
- **THEN** the tab strip keeps each tab compact enough to preserve more visible tabs before overflow, using a dense single-line treatment instead of a metadata-heavy stacked card

#### Scenario: User accesses workspace-wide actions while editing a request
- **WHEN** the user is editing an active request
- **THEN** workspace-global actions such as import or export remain available without occupying the primary request-local command runway

### Requirement: Primary request sections expose consistent density cues
The system SHALL expose comparable count badges across primary request-compose sections so users can scan request density and configured scope without opening every section individually.

#### Scenario: User scans request section tabs
- **WHEN** the user views the primary request section tabs in the workbench
- **THEN** params, headers, body, auth, tests, and environment sections present count badges using rules appropriate to their content type instead of leaving some primary sections without comparable density cues

#### Scenario: Body and auth configuration changes
- **WHEN** the user changes body mode, payload content, enabled form-data fields, or auth type
- **THEN** the body and auth count badges update to reflect the effective configured scope for the active request

### Requirement: Row-level request state controls remain low-noise
The system SHALL present params, headers, form-data fields, and environment-variable enabled states through a quiet row-level control that remains operable without overpowering the editable request data around it.

#### Scenario: User scans editable request rows
- **WHEN** the user views request parameter, header, form-data, or environment-variable rows
- **THEN** each row shows an enabled-state control that communicates on/off status clearly without repeating a loud textual status badge in every row

#### Scenario: User disables a request row
- **WHEN** the user toggles a row into the disabled state
- **THEN** the control state and row styling both reflect that the row is inactive while preserving the ability to re-enable it directly from the same location

### Requirement: Request segmented controls show one active option at a time
The system SHALL render request-side segmented option groups through one consistent active-state treatment so only the selected body/auth option appears active.

#### Scenario: User changes request body mode
- **WHEN** the user switches between `json`, `formdata`, `raw`, and `binary`
- **THEN** only the currently selected body-mode option shows active elevation, border emphasis, or shadow, and previously active options return to the neutral state immediately

#### Scenario: User changes request auth mode
- **WHEN** the user switches between auth options such as `none`, `bearer`, `basic`, and `apiKey`
- **THEN** only the selected auth option shows active treatment, with no residual highlight left on the default option after selection changes

### Requirement: Expanded request tabs remain compact in dense workspaces
The system SHALL compress expanded-mode request tabs so they preserve quick tab switching in high-tab-count workflows without duplicating rich metadata already shown in the active request workbench.

#### Scenario: User scans the expanded request tab strip
- **WHEN** the user views request tabs in expanded mode
- **THEN** each tab emphasizes method, truncated request name, one compact lifecycle/status indicator, and the close action rather than rendering stacked collection/provenance/persistence badges inside every tab

#### Scenario: User relies on tab status while many tabs are open
- **WHEN** non-active request tabs have differing lifecycle states such as unsaved, running, success, or failure
- **THEN** each tab surfaces that state through one compact indicator that remains readable at the denser tab width

### Requirement: Workbench zones read as connected console segments
The system SHALL present the sidebar, request, and response zones as docked console segments seated inside one shared workbench carrier so the desktop shell reads as one professional device instead of several floating cards.

#### Scenario: User views the desktop workbench shell
- **WHEN** the user views the workbench in desktop width with sidebar, request, and response visible
- **THEN** the three zones retain distinct local shells but are visually connected through aligned edges, narrow seams, and restrained splitter feedback instead of wide card gaps

#### Scenario: User views the compact stacked workbench shell
- **WHEN** the user views the workbench in compact layout with request and response stacked vertically
- **THEN** the stacked zones preserve the same docked-segment visual language so they still read as connected parts of one console

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
The system SHALL present the response inspection surface as a diagnostic view that distinguishes result state, transport metadata, and inspection modes through a stable professional-console hierarchy.

#### Scenario: User has not sent the active request yet
- **WHEN** the active request tab has no completed send result
- **THEN** the response inspection region shows an explicit idle state instead of presenting the pane as a successful response

#### Scenario: User sends a request while a previous result is visible
- **WHEN** the user triggers a send for the active request and the response region still contains the prior completed result
- **THEN** the response inspection region shows that a new response is pending and that any retained result content is stale until the new send completes

#### Scenario: Request send returns an error
- **WHEN** the active request send fails with an HTTP or transport error
- **THEN** the response inspection region presents an explicit error-oriented state while preserving access to the relevant response details that are available

### Requirement: Shared interaction tokens distinguish priority and runtime feedback consistently
The system SHALL use one consistent interaction-token language for primary actions, secondary actions, active selections, hover states, focus states, and runtime status indicators across the workbench.

#### Scenario: User scans actions and statuses across workbench surfaces
- **WHEN** the user compares buttons, tabs, badges, state pills, and runtime indicators across header, explorer, request, and response surfaces
- **THEN** the interface expresses priority and feedback through a consistent set of materials, contrast rules, and accent usage instead of each surface inventing its own visual semantics

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

### Requirement: Header shell separates brand, context, and utility controls
The system SHALL present the top workbench header as a professional control bar with distinct brand/navigation, context-switching, and utility zones so users can read shell identity and active runtime context at a glance.

#### Scenario: User views the workbench header on desktop width
- **WHEN** the user views the main workbench shell in a standard desktop-width window
- **THEN** the header reads as a compact top control bar whose brand, workspace/environment context, and utility actions are visually separated without feeling like a generic website navigation strip

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

### Requirement: Resource browsing and request tabs share lifecycle state language
The system SHALL express workbench lifecycle signals through one shared vocabulary across sidebar rows, request tabs, and request context surfaces so users can correlate open, active, unsaved, sending, failed, and recovered work states without interpreting each surface differently.

#### Scenario: User edits a saved request with one open canonical tab
- **WHEN** the user opens a saved request, edits it, and keeps it as the current active tab
- **THEN** the sidebar row, request tab, and request context surfaces all identify that object consistently as the active saved request with unsaved changes

#### Scenario: User views a dirty canonical resource tab
- **WHEN** the user is editing the canonical tab for a saved request and the tab has unsaved changes
- **THEN** the workbench presents the tab as a resource-origin draft and MUST NOT reuse the same "saved" label for both provenance and persistence state

#### Scenario: User restores a request from history
- **WHEN** the user reopens a history item into the workbench
- **THEN** the sidebar, request tab, and request context surfaces identify it consistently as a recovered work item distinct from the canonical saved request

### Requirement: Request workbench communicates send readiness before execution
The system SHALL present request-local send blockers and advisories within the request workbench before execution so users can determine whether the current request is ready without waiting for response-side error feedback.

#### Scenario: User has a blocking request issue
- **WHEN** the active request contains a blocking issue such as an empty URL, unresolved required variables, invalid JSON, or missing binary payload
- **THEN** the request workbench surfaces that issue before send and does not require the user to infer readiness from a later response failure

#### Scenario: User has a non-blocking request advisory
- **WHEN** the active request has advisories such as unsaved changes but is otherwise runnable
- **THEN** the request workbench indicates the advisory while preserving the ability to send the request

### Requirement: Dirty request tabs require an explicit close decision
The system SHALL require an explicit save-or-discard decision before closing a request tab that contains unsaved work so users do not lose in-progress edits by triggering a generic tab close action.

#### Scenario: User attempts to close a dirty request tab
- **WHEN** the user closes a request tab whose work is unsaved or detached from a saved resource
- **THEN** the system keeps the tab open and presents actions to save before closing, discard changes, or cancel the close action

#### Scenario: User saves from the dirty-close confirmation
- **WHEN** the user chooses to save from the dirty-close confirmation and completes the save flow successfully
- **THEN** the system persists the request and closes the original tab after the save completes
