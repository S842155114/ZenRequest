## Context

`RequestParams` currently renders request-compose sections through an uncontrolled `Tabs` surface with `default-value="params"`. That structure makes it easy to render the sections, but it does not provide a reliable hook for "leaving" one section and reconciling its draft rows before another section becomes active. The table-style sections also share simple array-backed row models with no built-in validation metadata, so blank draft rows and partially configured rows remain visually indistinguishable until the user manually notices them.

This change is intentionally scoped to the request compose tables that behave like editable key/value grids: `params`, `headers`, `form-data`, and `environment variables`. It does not change auth/test editors, request persistence, or request execution contracts.

## Goals / Non-Goals

**Goals:**
- Remove fully empty draft rows when the user leaves a supported table-style section.
- Keep partially edited rows in place and mark missing required keys explicitly.
- Preserve tab switching while keeping invalid-row state visible on the relevant section trigger.
- Reuse the existing request row models without introducing a new persistence schema.

**Non-Goals:**
- Add new validation rules beyond "`key` is required, `value` may be empty" for the supported tables.
- Change save/send blocking rules or request-readiness semantics in this pass.
- Extend the behavior to `auth`, `tests`, `json/raw` text editors, or other non-table compose surfaces.

## Decisions

### Decision: Control the active request-compose section so section-leave cleanup becomes explicit
`RequestParams` will move from an uncontrolled default tab to controlled active-section state. When the active section changes, the component will reconcile the section being left before rendering the newly active section.

For supported tables, reconciliation will run in this order:
1. Remove rows whose editable fields are all empty.
2. Recompute invalid-row state for rows that remain.

Rationale:
- The requested behavior is tied to leaving one section, which cannot be modeled reliably with a static `default-value`.
- Cleanup must happen before validation so untouched blank rows disappear instead of producing meaningless errors.

Alternatives considered:
- Validate on every new-row creation. Rejected because the user explicitly wanted untouched blank rows to stay quiet until they are edited or discarded on section leave.
- Keep uncontrolled tabs and infer the previous section through DOM events. Rejected because it is more brittle and harder to test.

### Decision: Use section-scoped derived validation state instead of mutating request row models
The existing request row arrays will remain the source of request data. Validation visibility will be tracked separately at the section level and derived from current row content, rather than by adding validation flags to `KeyValueItem` or `FormDataFieldSnapshot`.

The supported rule set is:
- `key` is required
- `value` is optional
- validation is revealed after meaningful row editing or after section-leave reconciliation

Rationale:
- The request snapshot types are shared across the workbench and persistence flows; UI-only validation metadata should not leak into them.
- Derived validation keeps cleanup, deletion, and cloning logic simpler because the source data shape does not change.

Alternatives considered:
- Store validation flags directly on each row object. Rejected because it pollutes request data with presentation-only state.
- Generate persistent synthetic row ids for every table entry. Rejected for this pass because the current arrays are append/remove only and do not need a broader model change yet.

### Decision: Keep navigation permissive and surface errors through inline plus trigger-level cues
Tab switching will remain non-blocking even if the section being left still contains invalid rows. The invalid rows will keep inline helper feedback, and the relevant section trigger will expose an invalid-row summary so the user can find the problem again after switching.

For `form-data`, the invalid-row state will be surfaced through the enclosing `Body` section trigger when `bodyType === 'formdata'`, because `form-data` is an inner body mode rather than a top-level request section.

Rationale:
- The user explicitly chose permissive navigation with persistent feedback instead of a hard block.
- Trigger-level summaries reduce the chance that invalid rows disappear from awareness once another tab becomes active.

Alternatives considered:
- Block switching until all invalid rows are fixed. Rejected because it interrupts exploratory editing and was not the desired behavior.
- Show only inline errors without a section summary. Rejected because the user can no longer see the issue after switching away.

## Risks / Trade-offs

- [Risk] Automatic blank-row removal may surprise users who expected a placeholder row to stay visible. → Mitigation: only remove rows whose editable fields are completely empty, and only do it on section leave.
- [Risk] Section-level validation state can drift after row removal if it is stored too literally by index. → Mitigation: derive invalid rows from the latest array contents after each cleanup or edit-triggered recomputation.
- [Risk] The `Body` trigger may carry both density and invalid-row signals when `formdata` is active. → Mitigation: keep the invalid-row affordance compact and visually secondary to the existing count badge.
