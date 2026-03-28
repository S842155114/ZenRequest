## Why

ZenRequest now distinguishes request body modes and response inspection states, but text request bodies still fall back to a plain textarea and the response pane cannot seed any reusable local mock workflow. That leaves JSON authoring weaker than response inspection and forces users to manually copy response payloads when they want to turn a real response into a request-scoped mock baseline.

## What Changes

- Upgrade request `json` and `raw` body authoring from a plain textarea to a code-editor surface, with JSON syntax highlighting, formatting, and validation.
- Keep the response pane read-only as an inspection surface while adding a focused action that creates a request-local mock template from the latest completed response.
- Introduce a request-local mock template model that stores response-derived `status`, `statusText`, `headers`, `contentType`, and `body` for the active request.
- Add a secondary `Mock` section in the request workbench so users can edit the stored template, refresh it from the latest response, and manually enable or disable mock execution for that request.
- Route the existing `Send` action through the request-local mock template when mock is enabled, and mark the resulting response and history entries as mock-sourced instead of live-network sourced.

## Capabilities

### New Capabilities
- `request-mocks`: Request-local response templates that can be generated from the latest response, edited inside the request workbench, manually enabled per request, and executed through the existing send flow as mock results.

### Modified Capabilities
- `workbench-ui`: The request workbench and response inspection surface will gain request-side code-editor body authoring, a response-side mock-template creation action, a request-side mock configuration section, and explicit mock-source status cues.
- `history`: Execution history will distinguish mock-sourced executions from live-network executions so replay and provenance remain understandable after mock runs.

## Impact

- Affects request/response workbench UI in `src/components/request/*`, `src/components/response/*`, and workbench orchestration in `src/App.vue`.
- Affects request and response data contracts in `src/types/request.ts` plus related request-workspace helpers and persistence paths.
- Likely affects history recording and replay behavior so mock executions preserve clear provenance.
- Requires new or updated frontend tests for request body authoring, mock template generation, mock execution routing, response mock-source indicators, and history labeling.
