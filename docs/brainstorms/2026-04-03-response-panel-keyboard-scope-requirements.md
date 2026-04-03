---
date: 2026-04-03
topic: response-panel-keyboard-scope
---

# Response Panel Keyboard Scope

## Problem Frame

ZenRequest currently allows text-selection shortcuts in the response area to escape their intended interaction boundary. A concrete failure case is `Ctrl/Cmd + A` inside response content selecting the entire page instead of the response content the user is working with. This breaks desktop-app expectations, makes keyboard use feel unsafe, and signals that focus ownership inside the response panel is not clearly defined.

The response panel should behave like a first-class keyboard interaction region: keyboard behavior follows focus, local actions stay local, and the panel does not accidentally swallow future application-level global commands.

## Requirements

**Scope Model**
- R1. The response panel must follow a focus-first keyboard model: when keyboard focus is inside the response panel, response-panel behavior is determined by the focused response-panel subregion rather than by page-level selection behavior.
- R2. Keyboard interactions originating inside the response panel must not fall through into whole-page selection or other document-wide text operations when the focused response-panel subregion has no meaningful local equivalent.
- R3. The response panel must preserve a distinct path for application-level global shortcuts so future app-wide commands can still take priority over panel-local behavior when explicitly designated as global.

**Response Views**
- R4. The keyboard scope rules must cover all response panel content views: `Body`, `Headers`, `Cookies`, and `Tests`.
- R5. In `Body` `Source` mode, `Ctrl/Cmd + A` on a focused response content region must select the body content for that region rather than the entire application page.
- R6. In `Body` `Preview` mode, selection shortcuts should defer to the preview content's native selection behavior when that behavior is meaningful and locally scoped. If the preview region does not expose selectable local content or an independent document context, the shortcut must not escalate into whole-page selection and does not need to provide an alternate local select-all behavior in this phase.
- R7. In `Headers`, `Cookies`, and `Tests` views, when focus is inside the response panel but not on a text-editable field, `Ctrl/Cmd + A` must not trigger whole-page selection. These views may remain non-select-all regions in this phase.

**Keyboard Accessibility**
- R8. The response panel must support a keyboard-accessible interaction model that allows users to reach, understand, and operate the panel without relying on a mouse.
- R9. The response panel must provide a predictable focus path across its major interactive regions, including tab controls, panel actions, and the active content region.
- R10. Keyboard navigation inside the response panel must be consistent with the active view so users can tell which region is focused and what keyboard actions apply there.
- R11. Focus movement and keyboard handling inside the response panel must avoid trapping the user; users must be able to move into and out of the panel through standard keyboard navigation.
- R13. This phase's required keyboard navigation coverage is limited to predictable `Tab` and `Shift+Tab` movement between the response panel's major interactive regions, keyboard reachability of response tabs and panel actions, and a stable way to move keyboard focus into the active content region.

**Platform Semantics**
- R12. Keyboard requirements must be defined in terms of the platform's primary modifier key rather than platform-specific wording, so the same interaction model applies across supported desktop environments.
- R14. The response panel must not indiscriminately consume unknown primary-modifier shortcut combinations. Shortcut handling must leave room for explicitly designated application-level global commands to take precedence without requiring this phase to define the full global shortcut set.

## Success Criteria
- Using the platform primary-modifier plus `A` inside response panel content never selects the entire application page.
- A keyboard-only user can move through the response panel's primary controls and content regions with predictable focus behavior.
- `Body` source view supports local full-content selection that matches user expectation for an editor-like response surface.
- Non-body response views no longer produce destructive or confusing page-wide selection side effects when keyboard focus is inside the panel.
- The response panel's keyboard behavior leaves room for future explicitly global app shortcuts instead of hard-coding the panel as the top priority for every key combination.
- Planning and implementation can keep this phase bounded to a minimum response-panel keyboard-navigation surface instead of expanding into a whole-application shortcut redesign.

## Scope Boundaries
- This work is limited to the response panel and its internal content views.
- This phase does not define the keyboard-scope model for request editing, sidebar navigation, dialogs, or other application regions.
- This phase does not require `Headers`, `Cookies`, or `Tests` views to implement rich local selection semantics beyond preventing page-wide misbehavior.
- This phase does not require enumerating or implementing the application's future global shortcut set; it only requires that the response panel not be designed in a way that blocks explicitly designated global commands.
- This phase does not require a comprehensive keyboard-navigation redesign beyond the minimum response-panel coverage defined in R13.

## Key Decisions
- Focus-first model: Keyboard behavior should follow the currently focused response-panel region, not the most recently clicked area.
- Response-panel-only first phase: The current problem is real and user-visible in the response panel, so the first requirements slice stays there rather than expanding into a whole-app shortcut redesign.
- Full response-panel coverage: All response views are in scope so the panel does not end up with one corrected tab and several inconsistent ones.
- View-specific selection behavior: `Body` source mode should support local select-all, preview mode should defer to meaningful native behavior, and non-body views only need to avoid page-wide misbehavior in this phase.
- High accessibility bar: The panel should be treated as a keyboard-operable desktop-style interaction region, not a mouse-first surface with a single hotfix.
- Global shortcut preservation: The response panel must coexist with a future app-level shortcut layer rather than assuming all focused shortcuts belong to the panel forever, but this phase does not define that layer in detail.

## Dependencies / Assumptions
- The response panel already has stable conceptual subregions such as tabs, actions, and active content that can be represented as focusable interaction regions.
- ZenRequest intends to keep supporting desktop-style keyboard interaction across platforms rather than limiting shortcut behavior to browser defaults.

## Outstanding Questions

### Deferred to Planning
- [Affects R1][Technical] What focusable boundaries and semantics already exist inside the response panel and its child viewers, and which of them can be reused versus normalized during implementation?
- [Affects R3][Needs research] What is the cleanest way to reserve a future app-level global shortcut channel without prematurely hard-coding a full shortcut registry?
- [Affects R8][Technical] Which keyboard navigation expectations should be mapped onto standard ARIA/tab semantics versus custom panel-level handling for desktop-like behavior?
- [Affects R10][Needs research] Which focus indicators or active-region affordances are already present, and what minimal additions are required so users can understand current keyboard scope?

## Next Steps

→ /prompts:ce-plan for structured implementation planning
