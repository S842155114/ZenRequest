## 1. Response Body Mode Controls

- [x] 1.1 Extend the response-body derived state so the UI can determine when the active payload is eligible for HTML preview.
- [x] 1.2 Update `ResponsePanel` to add a body-local source/preview mode switch for HTML responses and fall back to source-only inspection for non-HTML payloads.

## 2. HTML Preview Surface

- [x] 2.1 Implement an isolated embedded preview surface that renders the active HTML response body without injecting response markup into the main application DOM.
- [x] 2.2 Add or update localized response-panel copy for preview mode labels and any supporting preview-specific messaging.

## 3. Verification

- [x] 3.1 Add or update unit and component tests covering HTML preview eligibility, mode switching, active-response updates, and non-HTML fallback behavior.
- [x] 3.2 Run `pnpm test` and any targeted verification needed to confirm the response panel still behaves correctly with and without HTML preview mode.
