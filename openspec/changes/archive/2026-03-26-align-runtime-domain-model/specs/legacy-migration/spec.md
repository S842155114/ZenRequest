## ADDED Requirements

### Requirement: Legacy frontend-local data migrates into a default workspace
The system SHALL migrate recoverable legacy frontend-local data into a default user workspace when migrated runtime workspace data does not yet exist.

#### Scenario: Legacy local data present
- **WHEN** the app finds legacy frontend-local data and no migrated runtime workspace data
- **THEN** the system creates a default workspace and migrates recoverable collections, requests, environments, history, and session state into it

### Requirement: Migration does not rerun after successful runtime initialization
The system SHALL avoid rerunning legacy migration once migrated runtime workspace data has been established.

#### Scenario: Migrated runtime data already exists
- **WHEN** the app starts and migrated runtime workspace data already exists
- **THEN** the system skips legacy migration and does not create a new default workspace from old local state
