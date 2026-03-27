## Why

The request compose surface currently keeps abandoned blank rows in table-style sections and does not clearly signal when a partially edited row is missing its required key. That makes `params`, `headers`, `form-data`, and `environment` tabs noisier than they should be and forces users to rediscover invalid rows after they have already moved on to another section.

## What Changes

- Automatically remove untouched blank rows when the user leaves a supported table-style request section.
- Validate supported request-table rows with the rule that `key` is required while `value` may remain empty.
- Keep partially edited invalid rows in place, surface inline error feedback, and expose section-level invalid-row indicators without blocking tab switching.
- Apply the same cleanup and validation behavior to `params`, `headers`, `form-data`, and `environment variables`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workbench-ui`: refine request compose table sections so blank draft rows are cleaned up on section leave and missing required keys stay visible through inline and tab-level validation cues

## Impact

- Affected frontend files will primarily include `src/components/request/RequestParams.vue` and any parent/request-shell components that need to preserve section state or surface validation summaries.
- Request-compose i18n copy and component tests will need updates to cover cleanup timing, invalid-row feedback, and section-trigger validation indicators.
