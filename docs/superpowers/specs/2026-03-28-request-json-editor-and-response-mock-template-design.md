## Context

The current request workbench already distinguishes `json`, `raw`, `formdata`, and `binary` body modes at the data-model level, but the text body modes still use a plain textarea. That leaves JSON editing with only lightweight validation and no code-oriented affordances.

The response workbench is already stronger in this area. It uses a read-only code viewer with syntax-aware formatting for JSON, HTML, XML, and plain text, and the response pane now has an explicit inspection and lifecycle contract.

The requested direction is therefore not to make the existing response pane editable in place. The user intent is:

- upgrade request JSON editing to a proper code-editor experience
- keep the response pane as an inspection-first surface
- allow the latest completed response to seed a reusable response template
- use that template for mock, replay, and assertion-oriented workflows

For the first version, the primary workflow is a request-local mock template that is generated from the latest response and manually enabled only for the current request.

## Goals / Non-Goals

**Goals:**
- Replace the request `json` and `raw` textarea path with a code-editor surface.
- Provide JSON syntax highlighting, formatting, and validation for request-body editing.
- Keep the response pane read-only and inspection-first.
- Allow users to generate a single response-backed mock template from the latest response of the active request.
- Make the generated template editable in the request workbench.
- Let the existing `Send` flow return the mock template result when mock is manually enabled for that request.
- Run existing request tests against the mocked result when mock is enabled.

**Non-Goals:**
- Do not make the live response viewer itself the primary authoring surface.
- Do not add multiple templates, template rules, conditional matching, or priority ordering in v1.
- Do not introduce a separate top-level template resource center in v1.
- Do not support global or environment-wide interception in v1.
- Do not add binary-response authoring, cookie editors, streaming-response simulation, or HTML preview authoring in v1.

## Decisions

### 1. Use one shared code-editor foundation for request text bodies and mock-template bodies

The request-side `json` and `raw` body modes will move from a plain textarea to a code-editor surface. The mock-template body editor will use the same foundation so the product does not maintain two different text-authoring experiences.

For JSON content, the editor must provide:

- syntax highlighting
- format / pretty-print action
- validation feedback

For non-JSON text content, the editor can remain a simpler text-oriented code editor in v1 without preview-specific tooling.

Why:
- It closes the current request-editor gap directly.
- It reuses an interaction model the product already applies successfully in the response viewer.
- It keeps request and mock-template body authoring visually and behaviorally consistent.

Alternatives considered:
- Keep request JSON on textarea and only improve validation. Rejected because it does not materially improve authoring.
- Make the response viewer editable and reuse that surface. Rejected because it blurs response inspection and response authoring into one ambiguous pane.

### 2. Keep the response pane read-only and add a `Create Mock Template` action there

The response pane remains an inspection surface. It gains a focused action that converts the latest completed response into a request-local template instead of turning the whole pane into an editor.

The action creates or overwrites a single mock template attached to the active request. The initial template payload is copied from the latest completed response:

- `status`
- `statusText`
- `headers`
- `contentType`
- `body`

Why:
- The response pane is the correct place to originate the template because that is where the source material already exists.
- The edit experience belongs in the request workspace, not inside the inspection pane.
- This preserves the product’s current request-authoring vs response-inspection contract.

Alternative considered:
- Open a full authoring drawer from the response pane. Rejected for v1 because it still mixes inspection and authoring too tightly and would complicate response lifecycle semantics.

### 3. Add a request-local `Mock` configuration section for template editing

The generated template will be edited from the request side, not the response side.

The request workbench gains a secondary `Mock` section alongside the existing secondary configuration areas such as `Auth`, `Tests`, and `Env`. This section owns all template authoring and template control behavior.

The `Mock` section contains:

- a request-local master toggle such as `Enable mock for this request`
- a read-only origin hint such as `Generated from latest response`
- a `Refresh from latest response` action
- editable `status code`
- editable `status text`
- editable `headers` table with row-level enable / disable control
- editable `body`

If `Refresh from latest response` would overwrite user edits, the system must require explicit confirmation first.

Why:
- It keeps all authoring inside the request workspace where users already configure request behavior.
- It makes the mock template feel like part of the request, not a detached resource with unclear ownership.
- It leaves room for future expansion without introducing a new top-level information architecture in v1.

### 4. Keep one send entrypoint and treat mocked execution as a local response source

The product keeps the existing `Send` action. It does not add a second primary execution button for mock.

When mock is enabled for the active request:

- the existing `Send` action bypasses the real network call
- the app materializes a response result from the stored template
- the response pane displays that result through the existing response lifecycle and inspection model
- the UI marks the result as mock-sourced so it cannot be confused with a live network response
- request tests execute against the mock result

When mock is disabled, the request returns to the current live-network send flow with no template involvement.

History should preserve the distinction between live and mock executions so the user can understand the provenance of past results.

Why:
- It keeps the execution model simple: one request, one send action, one response destination.
- It lets mock, replay, and assertion workflows use the same response-inspection loop users already understand.
- It avoids fragmenting the request command bar with separate primary actions.

### 5. Limit v1 to one template per request

The first version supports one mock template per request.

This means:

- no named template collection
- no default-template selection
- no conditional rule engine
- no request-to-template routing logic beyond the current request

Why:
- It matches the approved user goal with the smallest reliable surface area.
- It avoids introducing list management, ordering, and matching semantics before the single-template workflow is proven.
- It keeps persistence and tab-state changes small enough to reason about safely.

## Risks / Trade-offs

- [Users may confuse live responses with mock responses] -> Mitigation: keep response inspection read-only, add a clear mock source badge in the response pane, and make the request-local mock toggle visually explicit.
- [Refreshing a template from the latest response may destroy manual edits] -> Mitigation: require confirmation whenever the template is dirty.
- [Adding mock-template persistence expands the request model] -> Mitigation: keep the v1 data shape narrow and request-local so it can be added without inventing a new resource subsystem.
- [Single-template v1 may feel restrictive later] -> Mitigation: treat one-template-per-request as a deliberate first slice that can be extended to named variants in a later change.
