## 1. Section Leave Reconciliation

- [x] 1.1 Refactor `RequestParams` to use controlled request-section state and reconcile the section being left before the next section becomes active
- [x] 1.2 Remove fully empty rows on section leave for `params`, `headers`, `env`, and `formdata`, while preserving the existing request-model synchronization behavior

## 2. Validation Feedback

- [x] 2.1 Add section-scoped row validation for supported table-style sections where `key` is required and `value` may remain empty
- [x] 2.2 Surface inline invalid-row feedback plus trigger-level invalid summaries without blocking tab switching, including `Body` trigger feedback when `bodyType === 'formdata'`

## 3. Copy And Styling

- [x] 3.1 Add or update i18n copy and component styling needed for row-level validation messages and section-trigger invalid indicators

## 4. Verification

- [x] 4.1 Update `src/components/request/RequestParams.test.ts` and any affected request workbench tests to cover blank-row cleanup, invalid-row persistence across tab switches, and valid-state recovery
- [x] 4.2 Run targeted request workbench tests plus `pnpm test` and `pnpm build`
