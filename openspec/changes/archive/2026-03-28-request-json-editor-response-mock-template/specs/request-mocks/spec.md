## ADDED Requirements

### Requirement: Requests can own one request-local mock template
The system SHALL allow each request draft or saved request to hold at most one request-local mock template with an explicit enabled state, status, status text, content type, body, and editable response headers.

#### Scenario: User saves a request with a configured mock template
- **WHEN** the user saves a request that has a configured request-local mock template
- **THEN** the system persists that template as part of the saved request instead of discarding it as transient UI-only state

#### Scenario: User reopens a request with a configured mock template
- **WHEN** the user reopens a saved request or restored session tab that already has a request-local mock template
- **THEN** the workbench restores the stored template fields and enabled state for that request

### Requirement: Latest completed responses can seed and refresh the request-local mock template
The system SHALL let users create or refresh the current request-local mock template from the latest completed response of that request.

#### Scenario: User creates a template from the latest completed response
- **WHEN** the active request has a completed response and the user invokes create-mock-template from the response surface
- **THEN** the system copies the latest response status, status text, headers, content type, and body into the request-local mock template

#### Scenario: User refreshes an existing template from the latest completed response
- **WHEN** the current request already has a stored mock template and the user invokes refresh from the latest completed response
- **THEN** the system requires explicit confirmation before replacing the stored template fields with the latest response data

### Requirement: Mock-enabled requests execute through the existing send flow
The system SHALL use the existing request send flow for mock-enabled requests while returning the stored request-local mock template as the execution result instead of performing a live network call.

#### Scenario: User sends a request with mock enabled
- **WHEN** the current request has a stored mock template and mock execution is enabled for that request
- **THEN** the existing send action returns the template result, evaluates the configured request tests against that mock result, and does not require a live transport call

#### Scenario: User sends a request with mock disabled
- **WHEN** the current request has a stored mock template but mock execution is disabled
- **THEN** the existing send action follows the normal live-network execution path and does not use the stored template as the response result
