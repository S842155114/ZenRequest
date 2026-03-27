## 1. Response Lifecycle Contract

- [x] 1.1 Define an explicit frontend response lifecycle model for idle, pending, success, HTTP error, and transport error states
- [x] 1.2 Update `App.vue` send-flow state handling so the response pane can mark retained content as stale while a new request is pending
- [x] 1.3 Refine `ResponsePanel` header and empty-state rendering so idle, pending, success, and error states are visually distinct

## 2. Request Editor Parity

- [x] 2.1 Split request body rendering in `RequestParams` so text modes and structured modes no longer share one generic editor surface
- [x] 2.2 Implement a structured `formdata` editing surface that matches the selected body mode
- [x] 2.3 Implement a `binary` body surface that captures file-oriented metadata instead of raw text input
- [x] 2.4 Add request-side validation and helper feedback needed to keep mode-specific editing understandable

## 3. Pane Layout State Behavior

- [x] 3.1 Define request-pane and response-pane collapse behavior as layout states with compact summaries and restore semantics
- [x] 3.2 Update workbench breakpoint handling so constrained-width layouts preserve request and response context across collapse and restore
- [x] 3.3 Persist or safely restore usable pane sizes and collapse state where the current session model allows it

## 4. Verification And Regression Coverage

- [x] 4.1 Add component tests for request body-mode rendering and mode-specific empty or helper states
- [x] 4.2 Add component tests for response idle, pending, stale, success, and error rendering behavior
- [x] 4.3 Add integration coverage for request send flow, pane collapse/restore, and constrained-width workbench continuity
