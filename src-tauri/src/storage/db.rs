use std::fs;
use std::path::Path;

use crate::errors::AppError;
use crate::models::{
    AppBootstrapPayload, AppSettings, ApplicationExportPackageDto, CollectionMutationPayloadDto,
    CreateCollectionPayloadDto, CreateEnvironmentPayloadDto, CreateWorkspacePayloadDto,
    DeleteCollectionPayloadDto, DeleteEnvironmentPayloadDto, DeleteRequestPayloadDto,
    DeleteWorkspacePayloadDto, EnvironmentDto, HistoryItemDto, HistoryStoredPayloadDto,
    ImportConflictStrategy, LegacyWorkspaceSnapshotDto, RemoveHistoryItemPayloadDto,
    RenameEnvironmentPayloadDto, RequestCollectionDto, RequestPresetDto, SaveRequestPayloadDto,
    SaveWorkspacePayloadDto, SetActiveWorkspacePayloadDto, UpdateEnvironmentVariablesPayloadDto,
    WorkspaceExportPackageDto, WorkspaceSummaryDto,
};
use crate::storage::connection::{db_error, open_connection};
use crate::storage::migrations::run_migrations;
use crate::storage::repositories::{
    collection_repo, environment_repo, history_repo, request_repo, settings_repo, workspace_repo,
};

pub fn initialize_database(db_path: &Path) -> Result<(), AppError> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            db_error(
                "failed to create sqlite directory",
                Some(format!("{} ({})", parent.display(), err)),
            )
        })?;
    }

    let mut connection = open_connection(db_path)?;
    run_migrations(&mut connection, db_path)?;
    Ok(())
}

pub fn load_settings(db_path: &Path) -> Result<Option<AppSettings>, AppError> {
    settings_repo::load_settings(db_path)
}

pub fn save_settings(db_path: &Path, settings: &AppSettings) -> Result<(), AppError> {
    settings_repo::save_settings(db_path, settings)
}

pub fn set_active_workspace(
    db_path: &Path,
    payload: &SetActiveWorkspacePayloadDto,
) -> Result<(), AppError> {
    workspace_repo::set_active_workspace(db_path, payload)
}

pub fn list_workspaces(db_path: &Path) -> Result<Vec<WorkspaceSummaryDto>, AppError> {
    workspace_repo::list_workspaces(db_path)
}

pub fn create_workspace(
    db_path: &Path,
    payload: &CreateWorkspacePayloadDto,
) -> Result<WorkspaceSummaryDto, AppError> {
    workspace_repo::create_workspace(db_path, payload)
}

pub fn delete_workspace(
    db_path: &Path,
    payload: &DeleteWorkspacePayloadDto,
) -> Result<(), AppError> {
    workspace_repo::delete_workspace(db_path, payload)
}

pub fn ensure_bootstrap_data(
    db_path: &Path,
    legacy_snapshot: Option<LegacyWorkspaceSnapshotDto>,
) -> Result<AppBootstrapPayload, AppError> {
    workspace_repo::ensure_bootstrap_data(db_path, legacy_snapshot)
}

pub fn export_workspace_package(
    db_path: &Path,
    workspace_id: &str,
) -> Result<WorkspaceExportPackageDto, AppError> {
    workspace_repo::export_workspace_package(db_path, workspace_id)
}

pub fn export_application_package(db_path: &Path) -> Result<ApplicationExportPackageDto, AppError> {
    workspace_repo::export_application_package(db_path)
}

pub fn import_workspace_package(
    db_path: &Path,
    package: &WorkspaceExportPackageDto,
    strategy: ImportConflictStrategy,
) -> Result<crate::models::WorkspaceImportResultDto, AppError> {
    workspace_repo::import_workspace_package(db_path, package, strategy)
}

pub fn import_application_package(
    db_path: &Path,
    package: &ApplicationExportPackageDto,
    strategy: ImportConflictStrategy,
) -> Result<crate::models::WorkspaceImportResultDto, AppError> {
    workspace_repo::import_application_package(db_path, package, strategy)
}

pub fn save_workspace_session(
    db_path: &Path,
    payload: &SaveWorkspacePayloadDto,
) -> Result<(), AppError> {
    workspace_repo::save_workspace_session(db_path, payload)
}

pub fn list_collections(
    db_path: &Path,
    workspace_id: &str,
) -> Result<Vec<RequestCollectionDto>, AppError> {
    collection_repo::list_collections(db_path, workspace_id)
}

pub fn create_collection(
    db_path: &Path,
    payload: &CreateCollectionPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    collection_repo::create_collection(db_path, payload)
}

pub fn rename_collection(
    db_path: &Path,
    payload: &CollectionMutationPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    collection_repo::rename_collection(db_path, payload)
}

pub fn delete_collection(
    db_path: &Path,
    payload: &DeleteCollectionPayloadDto,
) -> Result<(), AppError> {
    collection_repo::delete_collection(db_path, payload)
}

pub fn save_request(
    db_path: &Path,
    payload: &SaveRequestPayloadDto,
) -> Result<RequestPresetDto, AppError> {
    request_repo::save_request(db_path, payload)
}

pub fn delete_request(db_path: &Path, payload: &DeleteRequestPayloadDto) -> Result<(), AppError> {
    request_repo::delete_request(db_path, payload)
}

pub fn list_environments(
    db_path: &Path,
    workspace_id: &str,
) -> Result<Vec<EnvironmentDto>, AppError> {
    environment_repo::list_environments(db_path, workspace_id)
}

pub fn create_environment(
    db_path: &Path,
    payload: &CreateEnvironmentPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    environment_repo::create_environment(db_path, payload)
}

pub fn rename_environment(
    db_path: &Path,
    payload: &RenameEnvironmentPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    environment_repo::rename_environment(db_path, payload)
}

pub fn update_environment_variables(
    db_path: &Path,
    payload: &UpdateEnvironmentVariablesPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    environment_repo::update_environment_variables(db_path, payload)
}

pub fn delete_environment(
    db_path: &Path,
    payload: &DeleteEnvironmentPayloadDto,
) -> Result<(), AppError> {
    environment_repo::delete_environment(db_path, payload)
}

pub fn list_history(db_path: &Path, workspace_id: &str) -> Result<Vec<HistoryItemDto>, AppError> {
    history_repo::list_history(db_path, workspace_id)
}

pub fn clear_history(
    db_path: &Path,
    payload: &crate::models::HistoryQueryPayloadDto,
) -> Result<(), AppError> {
    history_repo::clear_history(db_path, payload)
}

pub fn remove_history_item(
    db_path: &Path,
    payload: &RemoveHistoryItemPayloadDto,
) -> Result<(), AppError> {
    history_repo::remove_history_item(db_path, payload)
}

pub fn insert_history_item(
    db_path: &Path,
    workspace_id: &str,
    payload: &HistoryStoredPayloadDto,
) -> Result<HistoryItemDto, AppError> {
    history_repo::insert_history_item(db_path, workspace_id, payload)
}

#[cfg(test)]
mod tests {
    use super::initialize_database;
    use crate::storage::connection::open_connection;
    use crate::storage::migrations::BASELINE_SCHEMA_VERSION;
    use rusqlite::{params, Connection};
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_db_path(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default();
        std::env::temp_dir().join(format!("zenrequest-{name}-{suffix}.sqlite3"))
    }

    fn schema_version(connection: &Connection) -> i64 {
        connection
            .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
            .expect("schema version")
    }

    fn table_columns(connection: &Connection, table: &str) -> Vec<String> {
        let mut statement = connection
            .prepare(&format!("PRAGMA table_info({table})"))
            .expect("prepare table info");
        let rows = statement
            .query_map([], |row| row.get::<_, String>(1))
            .expect("query table info");

        rows.map(|row| row.expect("column name")).collect()
    }

    fn legacy_v1_schema_sql() -> &'static str {
        r#"
        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE app_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          source_template_id TEXT,
          created_at_epoch_ms INTEGER NOT NULL,
          updated_at_epoch_ms INTEGER NOT NULL
        );

        CREATE TABLE workspace_sessions (
          workspace_id TEXT PRIMARY KEY,
          active_tab_id TEXT,
          active_environment_id TEXT,
          tabs_json TEXT NOT NULL,
          updated_at_epoch_ms INTEGER NOT NULL,
          FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        CREATE TABLE collections (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          expanded INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at_epoch_ms INTEGER NOT NULL,
          updated_at_epoch_ms INTEGER NOT NULL,
          FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        CREATE TABLE requests (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          collection_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          tags_json TEXT NOT NULL,
          method TEXT NOT NULL,
          url TEXT NOT NULL,
          params_json TEXT NOT NULL,
          headers_json TEXT NOT NULL,
          body TEXT NOT NULL,
          body_type TEXT NOT NULL,
          auth_json TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at_epoch_ms INTEGER NOT NULL,
          updated_at_epoch_ms INTEGER NOT NULL,
          FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
          FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
        );

        CREATE TABLE environments (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          name TEXT NOT NULL,
          variables_json TEXT NOT NULL,
          created_at_epoch_ms INTEGER NOT NULL,
          updated_at_epoch_ms INTEGER NOT NULL,
          FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        CREATE TABLE history_items (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          request_id TEXT,
          request_name TEXT NOT NULL,
          request_method TEXT NOT NULL,
          request_url TEXT NOT NULL,
          request_snapshot_json TEXT NOT NULL,
          status INTEGER NOT NULL,
          status_text TEXT NOT NULL,
          elapsed_ms INTEGER NOT NULL,
          size_bytes INTEGER NOT NULL,
          content_type TEXT NOT NULL,
          response_headers_json TEXT NOT NULL,
          response_preview TEXT NOT NULL,
          truncated INTEGER NOT NULL DEFAULT 0,
          executed_at_epoch_ms INTEGER NOT NULL,
          FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
          FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE SET NULL
        );

        CREATE INDEX idx_collections_workspace_id ON collections(workspace_id);
        CREATE INDEX idx_requests_workspace_id ON requests(workspace_id);
        CREATE INDEX idx_requests_collection_id ON requests(collection_id);
        CREATE INDEX idx_environments_workspace_id ON environments(workspace_id);
        CREATE INDEX idx_history_workspace_id ON history_items(workspace_id);
        CREATE INDEX idx_history_executed_at ON history_items(workspace_id, executed_at_epoch_ms DESC);
        "#
    }

    #[test]
    fn initialize_database_sets_latest_schema_version_for_fresh_databases() {
        let db_path = temp_db_path("fresh-schema-version");
        initialize_database(&db_path).expect("database initialized");

        let connection = open_connection(&db_path).expect("connection opened");
        assert_eq!(schema_version(&connection), BASELINE_SCHEMA_VERSION);

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn initialize_database_upgrades_legacy_v1_schema_without_losing_rows() {
        let db_path = temp_db_path("legacy-v1-upgrade");
        let connection = Connection::open(&db_path).expect("legacy connection opened");
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .expect("foreign keys enabled");
        connection
            .execute_batch(legacy_v1_schema_sql())
            .expect("legacy schema created");
        connection
            .pragma_update(None, "user_version", 1)
            .expect("legacy user version set");

        connection.execute(
            "INSERT INTO workspaces (id, name, description, source_template_id, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, '', NULL, 1, 1)",
            params!["workspace-legacy", "Legacy Workspace"],
        ).expect("workspace inserted");
        connection.execute(
            "INSERT INTO collections (id, workspace_id, name, description, expanded, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, '', 1, 0, 1, 1)",
            params!["collection-legacy", "workspace-legacy", "Legacy Collection"],
        ).expect("collection inserted");
        connection.execute(
            "INSERT INTO requests (
                id, workspace_id, collection_id, name, description, tags_json, method, url,
                params_json, headers_json, body, body_type, auth_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms
             ) VALUES (?1, ?2, ?3, ?4, '', '[]', 'GET', 'https://example.com/legacy', '[]', '[]', '', 'json', '{}', 0, 1, 1)",
            params!["request-legacy", "workspace-legacy", "collection-legacy", "Legacy Request"],
        ).expect("request inserted");
        connection.execute(
            "INSERT INTO history_items (
                id, workspace_id, request_id, request_name, request_method, request_url,
                request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type,
                response_headers_json, response_preview, truncated, executed_at_epoch_ms
             ) VALUES (?1, ?2, ?3, ?4, 'GET', 'https://example.com/legacy', '{}', 200, 'OK', 12, 24, 'application/json', '[]', '{\"ok\":true}', 0, 1)",
            params!["history-legacy", "workspace-legacy", "request-legacy", "Legacy Request"],
        ).expect("history inserted");
        drop(connection);

        initialize_database(&db_path).expect("database upgraded");

        let migrated = open_connection(&db_path).expect("connection opened");
        assert_eq!(schema_version(&migrated), BASELINE_SCHEMA_VERSION);

        let request_columns = table_columns(&migrated, "requests");
        for expected in [
            "tests_json",
            "mock_json",
            "body_content_type",
            "form_data_fields_json",
            "binary_file_name",
            "binary_mime_type",
        ] {
            assert!(
                request_columns.iter().any(|column| column == expected),
                "missing request column {expected}"
            );
        }

        let history_columns = table_columns(&migrated, "history_items");
        assert!(history_columns
            .iter()
            .any(|column| column == "execution_source"));

        let request_count: i64 = migrated
            .query_row("SELECT COUNT(*) FROM requests", [], |row| row.get(0))
            .expect("request count");
        let history_count: i64 = migrated
            .query_row("SELECT COUNT(*) FROM history_items", [], |row| row.get(0))
            .expect("history count");
        assert_eq!(request_count, 1);
        assert_eq!(history_count, 1);

        let tests_json: String = migrated
            .query_row(
                "SELECT tests_json FROM requests WHERE id = ?1",
                params!["request-legacy"],
                |row| row.get(0),
            )
            .expect("tests_json loaded");
        let execution_source: String = migrated
            .query_row(
                "SELECT execution_source FROM history_items WHERE id = ?1",
                params!["history-legacy"],
                |row| row.get(0),
            )
            .expect("execution source loaded");
        assert_eq!(tests_json, "[]");
        assert_eq!(execution_source, "live");

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn initialize_database_is_idempotent_for_latest_schema() {
        let db_path = temp_db_path("idempotent-schema");
        initialize_database(&db_path).expect("database initialized");
        initialize_database(&db_path).expect("database re-initialized");

        let connection = open_connection(&db_path).expect("connection opened");
        assert_eq!(schema_version(&connection), BASELINE_SCHEMA_VERSION);

        let _ = fs::remove_file(db_path);
    }
}
