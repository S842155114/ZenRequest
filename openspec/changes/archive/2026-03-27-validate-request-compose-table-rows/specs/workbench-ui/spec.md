## MODIFIED Requirements

### Requirement: Primary request sections expose consistent density cues
The system SHALL expose comparable count badges across primary request-compose sections and surface invalid-row summaries for supported table-style sections so users can scan request density and missing required input without opening every section individually.

#### Scenario: User scans request section tabs
- **WHEN** the user views the primary request section tabs in the workbench
- **THEN** params, headers, body, auth, tests, and environment sections present count badges using rules appropriate to their content type, and any supported table-style section with invalid rows exposes an invalid-row indicator or count on the relevant trigger

#### Scenario: Body and auth configuration changes
- **WHEN** the user changes body mode, payload content, enabled form-data fields, or auth type
- **THEN** the body and auth count badges update to reflect the effective configured scope for the active request

#### Scenario: Form-data rows become invalid
- **WHEN** body mode is `formdata` and one or more form-data rows are missing a required key
- **THEN** the `Body` section trigger reflects the invalid-row summary until those rows are corrected or removed

## ADDED Requirements

### Requirement: Table-style request sections clean empty drafts and retain actionable validation
The system SHALL remove untouched empty rows and retain actionable inline validation for partially edited rows in table-style request sections such as params, headers, form-data, and environment variables while allowing users to continue switching sections.

#### Scenario: User leaves a section with untouched blank rows
- **WHEN** the user leaves params, headers, form-data, or environment and a row contains no editable content
- **THEN** the system removes that row before showing the next section and does not persist a validation error for it

#### Scenario: User creates a new blank row
- **WHEN** the user adds a new row to a supported table-style section and has not entered any content
- **THEN** the system does not show a required-key error for that untouched row before the row is either edited or removed by section-leave cleanup

#### Scenario: User leaves a section with a partially configured row missing its key
- **WHEN** the user leaves a supported table-style section and a row still has user-entered content but an empty `key`
- **THEN** the system keeps that row, marks it invalid inline, and retains invalid-row state for that section

#### Scenario: User switches sections while invalid rows remain
- **WHEN** one or more supported table-style sections contain rows missing required keys
- **THEN** section switching still completes and the invalid-row state remains visible on the relevant section trigger until the rows are corrected or removed

#### Scenario: User corrects or clears an invalid row
- **WHEN** the user adds the missing `key` or clears the row back to empty
- **THEN** inline validation and the section-level invalid count update immediately, and rows that become fully empty are eligible for removal on the next section-leave cleanup
