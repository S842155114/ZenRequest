## Tasks

- [x] Freeze the domain contract for `Workspace`, `WorkspaceSession`, `Collection`, `Request`, `Environment`, `HistoryItem`, and `SystemTemplate`.
- [x] Define import/export package scopes, package versioning, and conflict-resolution behavior.
- [x] Design the SQLite schema and DTOs for multi-workspace persistence.
- [x] Define migration rules from current frontend-local state into the new runtime model.
- [x] Move collections, environments, history, and session persistence to Rust as authoritative domains.
- [x] Update frontend runtime integration to consume Rust-owned domain data instead of treating frontend state as the source of truth.
- [x] Add validation and tests for migration, persistence, import/export, and history redaction rules.
