use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::{Local, TimeZone};
use rusqlite::{params, Connection, OptionalExtension, Row};
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    AppBootstrapPayload, AppSettings, ApplicationExportPackageDto,
    CollectionMutationPayloadDto, CreateCollectionPayloadDto, CreateEnvironmentPayloadDto,
    CreateWorkspacePayloadDto, DeleteCollectionPayloadDto, DeleteEnvironmentPayloadDto,
    DeleteRequestPayloadDto, DeleteWorkspacePayloadDto, EnvironmentDto,
    ExportPackageScopeDto, HistoryItemDto, HistoryStoredPayloadDto, ImportConflictStrategy,
    LegacyWorkspaceSnapshotDto, RemoveHistoryItemPayloadDto, RenameEnvironmentPayloadDto,
    RequestCollectionDto, RequestPresetDto, RequestTabStateDto, SaveRequestPayloadDto,
    SaveWorkspacePayloadDto, SendRequestPayloadDto, SetActiveWorkspacePayloadDto,
    UpdateEnvironmentVariablesPayloadDto, WorkspaceExportDataDto, WorkspaceExportPackageDto,
    WorkspaceHistoryExportItemDto, WorkspaceSessionDto, WorkspaceSummaryDto,
};
use crate::storage::migrations::{baseline_sql, BASELINE_SCHEMA_VERSION};

const SETTINGS_ROW_KEY: &str = "app_settings";
const ACTIVE_WORKSPACE_KEY: &str = "active_workspace_id";

fn now_epoch_ms() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => i64::try_from(duration.as_millis()).unwrap_or(i64::MAX),
        Err(_) => 0,
    }
}

fn db_error(message: impl Into<String>, details: Option<String>) -> AppError {
    AppError {
        code: "DB_ERROR".to_string(),
        message: message.into(),
        details,
    }
}

fn open_connection(db_path: &Path) -> Result<Connection, AppError> {
    let connection = Connection::open(db_path).map_err(|err| {
        db_error(
            "failed to open sqlite database",
            Some(format!("{} ({})", db_path.display(), err)),
        )
    })?;
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|err| db_error("failed to enable foreign keys", Some(err.to_string())))?;
    Ok(connection)
}

fn serialize_json<T: serde::Serialize>(value: &T, label: &str) -> Result<String, AppError> {
    serde_json::to_string(value).map_err(|err| {
        db_error(
            format!("failed to serialize {label} payload"),
            Some(err.to_string()),
        )
    })
}

fn deserialize_json<T: serde::de::DeserializeOwned>(
    value: &str,
    label: &str,
) -> Result<T, AppError> {
    serde_json::from_str(value).map_err(|err| {
        db_error(
            format!("failed to parse {label} payload"),
            Some(err.to_string()),
        )
    })
}

fn format_history_time(epoch_ms: i64) -> String {
    let local = Local.timestamp_millis_opt(epoch_ms).single();
    match local {
        Some(value) => value.format("%H:%M:%S").to_string(),
        None => "00:00:00".to_string(),
    }
}

fn generate_id(prefix: &str) -> String {
    format!("{prefix}-{}", Uuid::new_v4())
}

fn ensure_requests_tests_column(connection: &Connection) -> Result<(), AppError> {
    let mut statement = connection
        .prepare("PRAGMA table_info(requests)")
        .map_err(|err| db_error("failed to inspect requests schema", Some(err.to_string())))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|err| db_error("failed to query requests schema", Some(err.to_string())))?;

    let mut has_tests_json = false;
    for row in rows {
        let column = row.map_err(|err| db_error("failed to read requests schema", Some(err.to_string())))?;
        if column == "tests_json" {
            has_tests_json = true;
            break;
        }
    }

    if !has_tests_json {
        connection
            .execute(
                "ALTER TABLE requests ADD COLUMN tests_json TEXT NOT NULL DEFAULT '[]'",
                [],
            )
            .map_err(|err| db_error("failed to migrate requests tests column", Some(err.to_string())))?;
    }

    Ok(())
}

pub fn initialize_database(db_path: &Path) -> Result<(), AppError> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            db_error(
                "failed to create sqlite directory",
                Some(format!("{} ({})", parent.display(), err)),
            )
        })?;
    }

    let connection = open_connection(db_path)?;
    connection.execute_batch(baseline_sql()).map_err(|err| {
        db_error(
            "failed to run sqlite migrations",
            Some(format!("{} ({})", db_path.display(), err)),
        )
    })?;
    ensure_requests_tests_column(&connection)?;
    connection
        .pragma_update(None, "user_version", BASELINE_SCHEMA_VERSION)
        .map_err(|err| {
            db_error(
                "failed to write sqlite schema version",
                Some(format!("{} ({})", db_path.display(), err)),
            )
        })?;
    Ok(())
}

pub fn load_settings(db_path: &Path) -> Result<Option<AppSettings>, AppError> {
    let connection = open_connection(db_path)?;
    let raw = connection
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![SETTINGS_ROW_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| db_error("failed to load settings from sqlite", Some(err.to_string())))?;

    raw.map(|value| deserialize_json::<AppSettings>(&value, "settings"))
        .transpose()
}

pub fn save_settings(db_path: &Path, settings: &AppSettings) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    save_settings_with_connection(&connection, settings)
}

fn save_settings_with_connection(
    connection: &Connection,
    settings: &AppSettings,
) -> Result<(), AppError> {
    let payload = serialize_json(settings, "settings")?;

    connection
        .execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![SETTINGS_ROW_KEY, payload],
        )
        .map_err(|err| db_error("failed to save settings into sqlite", Some(err.to_string())))?;
    Ok(())
}

fn load_active_workspace_id(connection: &Connection) -> Result<Option<String>, AppError> {
    connection
        .query_row(
            "SELECT value FROM app_metadata WHERE key = ?1",
            params![ACTIVE_WORKSPACE_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| db_error("failed to load active workspace id", Some(err.to_string())))
}

pub fn set_active_workspace(
    db_path: &Path,
    payload: &SetActiveWorkspacePayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "INSERT INTO app_metadata (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![ACTIVE_WORKSPACE_KEY, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to persist active workspace", Some(err.to_string())))?;
    Ok(())
}

pub fn list_workspaces(db_path: &Path) -> Result<Vec<WorkspaceSummaryDto>, AppError> {
    let connection = open_connection(db_path)?;
    list_workspaces_with_connection(&connection)
}

fn list_workspaces_with_connection(connection: &Connection) -> Result<Vec<WorkspaceSummaryDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, description, source_template_id
             FROM workspaces
             ORDER BY updated_at_epoch_ms DESC, created_at_epoch_ms DESC",
        )
        .map_err(|err| db_error("failed to prepare workspace listing", Some(err.to_string())))?;

    let rows = statement
        .query_map([], |row| {
            Ok(WorkspaceSummaryDto {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                source_template_id: row.get(3)?,
            })
        })
        .map_err(|err| db_error("failed to query workspaces", Some(err.to_string())))?;

    let mut workspaces = Vec::new();
    for row in rows {
        workspaces.push(row.map_err(|err| db_error("failed to map workspace", Some(err.to_string())))?);
    }
    Ok(workspaces)
}

fn load_workspace_summary_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<WorkspaceSummaryDto, AppError> {
    connection
        .query_row(
            "SELECT id, name, description, source_template_id
             FROM workspaces
             WHERE id = ?1",
            params![workspace_id],
            |row| {
                Ok(WorkspaceSummaryDto {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    source_template_id: row.get(3)?,
                })
            },
        )
        .map_err(|err| db_error("failed to load workspace", Some(err.to_string())))
}

fn workspace_name_exists(connection: &Connection, name: &str) -> Result<bool, AppError> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM workspaces WHERE name = ?1",
            params![name],
            |row| row.get(0),
        )
        .map_err(|err| db_error("failed to query workspace conflict", Some(err.to_string())))?;
    Ok(count > 0)
}

fn resolve_import_workspace_name(
    connection: &Connection,
    requested_name: &str,
    strategy: ImportConflictStrategy,
) -> Result<Option<String>, AppError> {
    let base_name = if requested_name.trim().is_empty() {
        "Imported Workspace"
    } else {
        requested_name.trim()
    };
    let exists = workspace_name_exists(connection, base_name)?;

    match strategy {
        ImportConflictStrategy::Skip if exists => Ok(None),
        ImportConflictStrategy::Skip => Ok(Some(base_name.to_string())),
        ImportConflictStrategy::Overwrite => {
            connection
                .execute("DELETE FROM workspaces WHERE name = ?1", params![base_name])
                .map_err(|err| {
                    db_error(
                        "failed to clear conflicting workspaces before import",
                        Some(err.to_string()),
                    )
                })?;
            Ok(Some(base_name.to_string()))
        }
        ImportConflictStrategy::Rename => {
            if !exists {
                return Ok(Some(base_name.to_string()));
            }

            let mut index = 1;
            loop {
                let candidate = if index == 1 {
                    format!("{base_name} (Imported)")
                } else {
                    format!("{base_name} (Imported {index})")
                };

                if !workspace_name_exists(connection, &candidate)? {
                    return Ok(Some(candidate));
                }

                index += 1;
            }
        }
    }
}

pub fn create_workspace(
    db_path: &Path,
    payload: &CreateWorkspacePayloadDto,
) -> Result<WorkspaceSummaryDto, AppError> {
    let connection = open_connection(db_path)?;
    create_workspace_record(&connection, payload.name.trim(), None)
}

pub fn delete_workspace(
    db_path: &Path,
    payload: &DeleteWorkspacePayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM workspaces WHERE id = ?1",
            params![payload.workspace_id],
        )
        .map_err(|err| db_error("failed to delete workspace", Some(err.to_string())))?;

    let remaining = list_workspaces_with_connection(&connection)?;
    let next_active = remaining.first().map(|item| item.id.clone());
    update_active_workspace_in_connection(&connection, next_active.as_deref())?;
    Ok(())
}

fn update_active_workspace_in_connection(
    connection: &Connection,
    workspace_id: Option<&str>,
) -> Result<(), AppError> {
    match workspace_id {
        Some(value) => {
            connection
                .execute(
                    "INSERT INTO app_metadata (key, value) VALUES (?1, ?2)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    params![ACTIVE_WORKSPACE_KEY, value],
                )
                .map_err(|err| db_error("failed to update active workspace", Some(err.to_string())))?;
        }
        None => {
            connection
                .execute(
                    "DELETE FROM app_metadata WHERE key = ?1",
                    params![ACTIVE_WORKSPACE_KEY],
                )
                .map_err(|err| db_error("failed to clear active workspace", Some(err.to_string())))?;
        }
    };

    Ok(())
}

fn create_workspace_record(
    connection: &Connection,
    name: &str,
    source_template_id: Option<&str>,
) -> Result<WorkspaceSummaryDto, AppError> {
    let timestamp = now_epoch_ms();
    let workspace = WorkspaceSummaryDto {
        id: generate_id("workspace"),
        name: if name.is_empty() {
            "Workspace".to_string()
        } else {
            name.to_string()
        },
        description: String::new(),
        source_template_id: source_template_id.map(ToString::to_string),
    };

    connection
        .execute(
            "INSERT INTO workspaces (id, name, description, source_template_id, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                workspace.id,
                workspace.name,
                workspace.description,
                workspace.source_template_id,
                timestamp,
                timestamp
            ],
        )
        .map_err(|err| db_error("failed to create workspace", Some(err.to_string())))?;

    connection
        .execute(
            "INSERT INTO workspace_sessions (workspace_id, active_tab_id, active_environment_id, tabs_json, updated_at_epoch_ms)
             VALUES (?1, NULL, NULL, ?2, ?3)",
            params![workspace.id, "[]", timestamp],
        )
        .map_err(|err| db_error("failed to create workspace session", Some(err.to_string())))?;

    Ok(workspace)
}

pub fn ensure_bootstrap_data(
    db_path: &Path,
    legacy_snapshot: Option<LegacyWorkspaceSnapshotDto>,
) -> Result<AppBootstrapPayload, AppError> {
    let connection = open_connection(db_path)?;
    let workspace_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
        .map_err(|err| db_error("failed to count workspaces", Some(err.to_string())))?;

    if workspace_count == 0 {
        if let Some(snapshot) = legacy_snapshot {
            let migrated = migrate_legacy_snapshot_with_connection(&connection, &snapshot)?;
            update_active_workspace_in_connection(&connection, Some(&migrated.id))?;
            if !snapshot.locale.is_empty() || !snapshot.theme_mode.is_empty() {
                let next_settings = AppSettings {
                    locale: if snapshot.locale.is_empty() {
                        "en".to_string()
                    } else {
                        snapshot.locale
                    },
                    theme_mode: if snapshot.theme_mode.is_empty() {
                        "dark".to_string()
                    } else {
                        snapshot.theme_mode
                    },
                };
                save_settings(db_path, &next_settings)?;
            }
        } else {
            let demo = seed_demo_workspace_with_connection(&connection)?;
            update_active_workspace_in_connection(&connection, Some(&demo.id))?;
        }
    }

    let settings = load_settings(db_path)?.unwrap_or_default();
    let workspaces = list_workspaces_with_connection(&connection)?;
    let active_workspace_id = load_active_workspace_id(&connection)?
        .or_else(|| workspaces.first().map(|item| item.id.clone()));

    if let Some(active_id) = active_workspace_id.as_deref() {
        update_active_workspace_in_connection(&connection, Some(active_id))?;
    }

    let session = active_workspace_id
        .as_deref()
        .map(|workspace_id| load_workspace_session_with_connection(&connection, workspace_id))
        .transpose()?;
    let collections = active_workspace_id
        .as_deref()
        .map(|workspace_id| load_collections_with_connection(&connection, workspace_id))
        .transpose()?
        .unwrap_or_default();
    let environments = active_workspace_id
        .as_deref()
        .map(|workspace_id| load_environments_with_connection(&connection, workspace_id))
        .transpose()?
        .unwrap_or_default();
    let history = active_workspace_id
        .as_deref()
        .map(|workspace_id| load_history_with_connection(&connection, workspace_id))
        .transpose()?
        .unwrap_or_default();

    Ok(AppBootstrapPayload {
        settings,
        workspaces,
        active_workspace_id,
        session: session.flatten(),
        collections,
        environments,
        history,
    })
}

pub fn export_workspace_package(
    db_path: &Path,
    workspace_id: &str,
) -> Result<WorkspaceExportPackageDto, AppError> {
    let connection = open_connection(db_path)?;
    let settings = load_settings(db_path)?.unwrap_or_default();
    let data = build_workspace_export_data_with_connection(&connection, workspace_id)?;

    Ok(build_workspace_export_package(&settings, data))
}

pub fn export_application_package(db_path: &Path) -> Result<ApplicationExportPackageDto, AppError> {
    let connection = open_connection(db_path)?;
    let settings = load_settings(db_path)?.unwrap_or_default();
    let active_workspace_id = load_active_workspace_id(&connection)?;
    let workspace_summaries = list_workspaces_with_connection(&connection)?;
    let mut workspaces = Vec::with_capacity(workspace_summaries.len());

    for workspace in workspace_summaries {
        workspaces.push(build_workspace_export_data_with_connection(&connection, &workspace.id)?);
    }

    Ok(ApplicationExportPackageDto {
        format_version: 1,
        scope: ExportPackageScopeDto::Application,
        exported_at_epoch_ms: u64::try_from(now_epoch_ms()).unwrap_or_default(),
        settings,
        active_workspace_id,
        workspaces,
    })
}

fn build_workspace_export_package(
    settings: &AppSettings,
    data: WorkspaceExportDataDto,
) -> WorkspaceExportPackageDto {
    WorkspaceExportPackageDto {
        format_version: 1,
        scope: ExportPackageScopeDto::Workspace,
        exported_at_epoch_ms: u64::try_from(now_epoch_ms()).unwrap_or_default(),
        settings: settings.clone(),
        workspace: data.workspace,
        session: data.session,
        collections: data.collections,
        environments: data.environments,
        history: data.history,
    }
}

fn build_workspace_export_data_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<WorkspaceExportDataDto, AppError> {
    let workspace = load_workspace_summary_with_connection(connection, workspace_id)?;
    let session = load_workspace_session_with_connection(connection, workspace_id)?;
    let collections = load_collections_with_connection(connection, workspace_id)?;
    let environments = load_environments_with_connection(connection, workspace_id)?;
    let history = load_history_export_with_connection(connection, workspace_id)?;

    Ok(WorkspaceExportDataDto {
        workspace,
        session,
        collections,
        environments,
        history,
    })
}

pub fn import_workspace_package(
    db_path: &Path,
    package: &WorkspaceExportPackageDto,
    strategy: ImportConflictStrategy,
) -> Result<crate::models::WorkspaceImportResultDto, AppError> {
    let connection = open_connection(db_path)?;
    let data = WorkspaceExportDataDto {
        workspace: package.workspace.clone(),
        session: package.session.clone(),
        collections: package.collections.clone(),
        environments: package.environments.clone(),
        history: package.history.clone(),
    };
    let workspace = import_workspace_data_with_connection(&connection, &data, strategy)?.ok_or_else(
        || {
            db_error(
                "workspace import skipped due to conflict",
                Some(package.workspace.name.clone()),
            )
        },
    )?;

    update_active_workspace_in_connection(&connection, Some(&workspace.id))?;
    Ok(crate::models::WorkspaceImportResultDto {
        scope: ExportPackageScopeDto::Workspace,
        workspace: workspace.clone(),
        imported_workspace_count: 1,
        active_workspace_id: Some(workspace.id),
    })
}

pub fn import_application_package(
    db_path: &Path,
    package: &ApplicationExportPackageDto,
    strategy: ImportConflictStrategy,
) -> Result<crate::models::WorkspaceImportResultDto, AppError> {
    let connection = open_connection(db_path)?;
    let mut imported_workspaces = Vec::new();

    for workspace_data in &package.workspaces {
        if let Some(workspace) =
            import_workspace_data_with_connection(&connection, workspace_data, strategy.clone())?
        {
            imported_workspaces.push((workspace_data.workspace.id.clone(), workspace));
        }
    }

    if imported_workspaces.is_empty() {
        return Err(db_error(
            "application import skipped due to conflicts",
            Some("No workspaces were imported".to_string()),
        ));
    }

    save_settings_with_connection(&connection, &package.settings)?;

    let active_workspace = package
        .active_workspace_id
        .as_ref()
        .and_then(|active_id| {
            imported_workspaces
                .iter()
                .find(|(old_id, _)| old_id == active_id)
                .map(|(_, workspace)| workspace.clone())
        })
        .unwrap_or_else(|| imported_workspaces[0].1.clone());

    update_active_workspace_in_connection(&connection, Some(&active_workspace.id))?;

    Ok(crate::models::WorkspaceImportResultDto {
        scope: ExportPackageScopeDto::Application,
        workspace: active_workspace.clone(),
        imported_workspace_count: imported_workspaces.len(),
        active_workspace_id: Some(active_workspace.id),
    })
}

fn import_workspace_data_with_connection(
    connection: &Connection,
    data: &WorkspaceExportDataDto,
    strategy: ImportConflictStrategy,
) -> Result<Option<WorkspaceSummaryDto>, AppError> {
    let Some(workspace_name) =
        resolve_import_workspace_name(connection, &data.workspace.name, strategy)?
    else {
        return Ok(None);
    };

    let workspace = create_workspace_record(
        connection,
        &workspace_name,
        data.workspace.source_template_id.as_deref(),
    )?;
    let timestamp = now_epoch_ms();

    let mut collection_id_map = HashMap::new();
    for (collection_index, collection) in data.collections.iter().enumerate() {
        let new_collection_id = generate_id("collection");
        collection_id_map.insert(collection.id.clone(), new_collection_id.clone());
        connection.execute(
                "INSERT INTO collections (id, workspace_id, name, description, expanded, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
                 VALUES (?1, ?2, ?3, '', ?4, ?5, ?6, ?7)",
                params![
                    new_collection_id,
                    workspace.id,
                    collection.name,
                    if collection.expanded { 1 } else { 0 },
                    i64::try_from(collection_index).unwrap_or(0),
                    timestamp,
                    timestamp
                ],
            )
            .map_err(|err| db_error("failed to import collection", Some(err.to_string())))?;
    }

    let mut request_id_map = HashMap::new();
    for collection in &data.collections {
        let imported_collection_id = collection_id_map
            .get(&collection.id)
            .ok_or_else(|| db_error("missing imported collection id", Some(collection.id.clone())))?;

        for (request_index, request) in collection.requests.iter().enumerate() {
            let new_request_id = generate_id("request");
            request_id_map.insert(request.id.clone(), new_request_id.clone());
            let tags_json = serialize_json(&request.tags, "request tags")?;
            let params_json = serialize_json(&request.params, "request params")?;
            let headers_json = serialize_json(&request.headers, "request headers")?;
            let auth_json = serialize_json(&request.auth, "request auth")?;
            let tests_json = serialize_json(&request.tests, "request tests")?;

            connection
                .execute(
                    "INSERT INTO requests
                     (id, workspace_id, collection_id, name, description, tags_json, method, url, params_json, headers_json, body, body_type, auth_json, tests_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                    params![
                        new_request_id,
                        workspace.id,
                        imported_collection_id,
                        request.name,
                        request.description,
                        tags_json,
                        request.method,
                        request.url,
                        params_json,
                        headers_json,
                        request.body,
                        request.body_type,
                        auth_json,
                        tests_json,
                        i64::try_from(request_index).unwrap_or(0),
                        timestamp,
                        timestamp
                    ],
                )
                .map_err(|err| db_error("failed to import request", Some(err.to_string())))?;
        }
    }

    let mut environment_id_map = HashMap::new();
    for environment in &data.environments {
        let new_environment_id = generate_id("env");
        environment_id_map.insert(environment.id.clone(), new_environment_id.clone());
        let variables_json = serialize_json(&environment.variables, "environment variables")?;
        connection
            .execute(
                "INSERT INTO environments (id, workspace_id, name, variables_json, created_at_epoch_ms, updated_at_epoch_ms)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    new_environment_id,
                    workspace.id,
                    environment.name,
                    variables_json,
                    timestamp,
                    timestamp
                ],
            )
            .map_err(|err| db_error("failed to import environment", Some(err.to_string())))?;
    }

    for history_item in &data.history {
        let mut request_snapshot = history_item.request_snapshot.clone();
        request_snapshot.workspace_id = workspace.id.clone();
        request_snapshot.request_id = request_snapshot
            .request_id
            .as_ref()
            .and_then(|request_id| request_id_map.get(request_id).cloned());

        let stored = HistoryStoredPayloadDto {
            request_id: history_item
                .request_id
                .as_ref()
                .and_then(|request_id| request_id_map.get(request_id).cloned()),
            request_name: history_item.request_name.clone(),
            request_method: history_item.request_method.clone(),
            request_url: history_item.request_url.clone(),
            request_snapshot,
            status: history_item.status,
            status_text: history_item.status_text.clone(),
            elapsed_ms: history_item.elapsed_ms,
            size_bytes: history_item.size_bytes,
            content_type: history_item.content_type.clone(),
            response_headers: history_item.response_headers.clone(),
            response_preview: history_item.response_preview.clone(),
            truncated: history_item.truncated,
            executed_at_epoch_ms: history_item.executed_at_epoch_ms,
        };

        let _ = insert_history_item_in_connection(connection, &workspace.id, &stored)?;
    }

    if let Some(session) = &data.session {
        let remapped_session = WorkspaceSessionDto {
            active_tab_id: session.active_tab_id.clone(),
            active_environment_id: session
                .active_environment_id
                .as_ref()
                .and_then(|environment_id| environment_id_map.get(environment_id).cloned()),
            open_tabs: session
                .open_tabs
                .iter()
                .map(|tab| {
                    let mut next = tab.clone();
                    next.request_id = tab
                        .request_id
                        .as_ref()
                        .and_then(|request_id| request_id_map.get(request_id).cloned());
                    next.collection_id = tab
                        .collection_id
                        .as_ref()
                        .and_then(|collection_id| collection_id_map.get(collection_id).cloned());
                    next
                })
                .collect(),
        };
        save_workspace_session_in_connection(connection, &workspace.id, &remapped_session)?;
    }

    Ok(Some(workspace))
}

pub fn save_workspace_session(
    db_path: &Path,
    payload: &SaveWorkspacePayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    let tabs_json = serialize_json(&payload.session.open_tabs, "workspace tabs")?;
    let updated_at = now_epoch_ms();
    connection
        .execute(
            "INSERT INTO workspace_sessions (workspace_id, active_tab_id, active_environment_id, tabs_json, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(workspace_id) DO UPDATE SET
               active_tab_id = excluded.active_tab_id,
               active_environment_id = excluded.active_environment_id,
               tabs_json = excluded.tabs_json,
               updated_at_epoch_ms = excluded.updated_at_epoch_ms",
            params![
                payload.workspace_id,
                payload.session.active_tab_id,
                payload.session.active_environment_id,
                tabs_json,
                updated_at
            ],
        )
        .map_err(|err| db_error("failed to save workspace session", Some(err.to_string())))?;
    Ok(())
}

pub fn list_collections(db_path: &Path, workspace_id: &str) -> Result<Vec<RequestCollectionDto>, AppError> {
    let connection = open_connection(db_path)?;
    load_collections_with_connection(&connection, workspace_id)
}

pub fn create_collection(
    db_path: &Path,
    payload: &CreateCollectionPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    let connection = open_connection(db_path)?;
    let timestamp = now_epoch_ms();
    let next_sort = next_sort_order(&connection, "collections", "workspace_id", &payload.workspace_id)?;
    let collection = RequestCollectionDto {
        id: generate_id("collection"),
        name: payload.name.trim().to_string(),
        expanded: true,
        requests: Vec::new(),
    };

    connection
        .execute(
            "INSERT INTO collections (id, workspace_id, name, description, expanded, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, '', 1, ?4, ?5, ?6)",
            params![collection.id, payload.workspace_id, collection.name, next_sort, timestamp, timestamp],
        )
        .map_err(|err| db_error("failed to create collection", Some(err.to_string())))?;

    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(collection)
}

pub fn rename_collection(
    db_path: &Path,
    payload: &CollectionMutationPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "UPDATE collections SET name = ?1, updated_at_epoch_ms = ?2 WHERE id = ?3 AND workspace_id = ?4",
            params![payload.name.trim(), now_epoch_ms(), payload.collection_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to rename collection", Some(err.to_string())))?;

    let collection = load_collection_with_requests(&connection, &payload.workspace_id, &payload.collection_id)?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(collection)
}

pub fn delete_collection(
    db_path: &Path,
    payload: &DeleteCollectionPayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM collections WHERE id = ?1 AND workspace_id = ?2",
            params![payload.collection_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to delete collection", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub fn save_request(
    db_path: &Path,
    payload: &SaveRequestPayloadDto,
) -> Result<RequestPresetDto, AppError> {
    let connection = open_connection(db_path)?;
    let timestamp = now_epoch_ms();
    let request_id = if payload.request.id.is_empty() {
        generate_id("request")
    } else {
        payload.request.id.clone()
    };
    let tags_json = serialize_json(&payload.request.tags, "request tags")?;
    let params_json = serialize_json(&payload.request.params, "request params")?;
    let headers_json = serialize_json(&payload.request.headers, "request headers")?;
    let auth_json = serialize_json(&payload.request.auth, "request auth")?;
    let tests_json = serialize_json(&payload.request.tests, "request tests")?;
    let sort_order = next_sort_order(&connection, "requests", "collection_id", &payload.collection_id)?;

    connection
        .execute(
            "INSERT INTO requests
             (id, workspace_id, collection_id, name, description, tags_json, method, url, params_json, headers_json, body, body_type, auth_json, tests_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
             ON CONFLICT(id) DO UPDATE SET
               workspace_id = excluded.workspace_id,
               collection_id = excluded.collection_id,
               name = excluded.name,
               description = excluded.description,
               tags_json = excluded.tags_json,
               method = excluded.method,
               url = excluded.url,
               params_json = excluded.params_json,
               headers_json = excluded.headers_json,
               body = excluded.body,
               body_type = excluded.body_type,
               auth_json = excluded.auth_json,
               tests_json = excluded.tests_json,
               updated_at_epoch_ms = excluded.updated_at_epoch_ms",
            params![
                request_id,
                payload.workspace_id,
                payload.collection_id,
                payload.request.name,
                payload.request.description,
                tags_json,
                payload.request.method,
                payload.request.url,
                params_json,
                headers_json,
                payload.request.body,
                payload.request.body_type,
                auth_json,
                tests_json,
                sort_order,
                timestamp,
                timestamp
            ],
        )
        .map_err(|err| db_error("failed to save request", Some(err.to_string())))?;

    touch_workspace(&connection, &payload.workspace_id)?;
    load_request_with_collection_name(&connection, &request_id)
}

pub fn delete_request(
    db_path: &Path,
    payload: &DeleteRequestPayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM requests WHERE id = ?1 AND workspace_id = ?2",
            params![payload.request_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to delete request", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub fn list_environments(db_path: &Path, workspace_id: &str) -> Result<Vec<EnvironmentDto>, AppError> {
    let connection = open_connection(db_path)?;
    load_environments_with_connection(&connection, workspace_id)
}

pub fn create_environment(
    db_path: &Path,
    payload: &CreateEnvironmentPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    let connection = open_connection(db_path)?;
    let environment = EnvironmentDto {
        id: generate_id("env"),
        name: payload.name.trim().to_string(),
        variables: Vec::new(),
    };
    let timestamp = now_epoch_ms();
    let variables_json = serialize_json(&environment.variables, "environment variables")?;

    connection
        .execute(
            "INSERT INTO environments (id, workspace_id, name, variables_json, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![environment.id, payload.workspace_id, environment.name, variables_json, timestamp, timestamp],
        )
        .map_err(|err| db_error("failed to create environment", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(environment)
}

pub fn rename_environment(
    db_path: &Path,
    payload: &RenameEnvironmentPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "UPDATE environments SET name = ?1, updated_at_epoch_ms = ?2 WHERE id = ?3 AND workspace_id = ?4",
            params![payload.name.trim(), now_epoch_ms(), payload.environment_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to rename environment", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    load_environment_with_connection(&connection, &payload.workspace_id, &payload.environment_id)
}

pub fn update_environment_variables(
    db_path: &Path,
    payload: &UpdateEnvironmentVariablesPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    let connection = open_connection(db_path)?;
    let variables_json = serialize_json(&payload.variables, "environment variables")?;
    connection
        .execute(
            "UPDATE environments SET variables_json = ?1, updated_at_epoch_ms = ?2 WHERE id = ?3 AND workspace_id = ?4",
            params![variables_json, now_epoch_ms(), payload.environment_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to update environment variables", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    load_environment_with_connection(&connection, &payload.workspace_id, &payload.environment_id)
}

pub fn delete_environment(
    db_path: &Path,
    payload: &DeleteEnvironmentPayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM environments WHERE id = ?1 AND workspace_id = ?2",
            params![payload.environment_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to delete environment", Some(err.to_string())))?;

    let fallback = connection
        .query_row(
            "SELECT id FROM environments WHERE workspace_id = ?1 ORDER BY updated_at_epoch_ms DESC LIMIT 1",
            params![payload.workspace_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| db_error("failed to query fallback environment", Some(err.to_string())))?;

    connection
        .execute(
            "UPDATE workspace_sessions SET active_environment_id = ?1, updated_at_epoch_ms = ?2 WHERE workspace_id = ?3",
            params![fallback, now_epoch_ms(), payload.workspace_id],
        )
        .map_err(|err| db_error("failed to update session after environment deletion", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub fn list_history(db_path: &Path, workspace_id: &str) -> Result<Vec<HistoryItemDto>, AppError> {
    let connection = open_connection(db_path)?;
    load_history_with_connection(&connection, workspace_id)
}

pub fn clear_history(db_path: &Path, payload: &crate::models::HistoryQueryPayloadDto) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM history_items WHERE workspace_id = ?1",
            params![payload.workspace_id],
        )
        .map_err(|err| db_error("failed to clear history", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub fn remove_history_item(
    db_path: &Path,
    payload: &RemoveHistoryItemPayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM history_items WHERE workspace_id = ?1 AND id = ?2",
            params![payload.workspace_id, payload.id],
        )
        .map_err(|err| db_error("failed to remove history item", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub fn insert_history_item(
    db_path: &Path,
    workspace_id: &str,
    payload: &HistoryStoredPayloadDto,
) -> Result<HistoryItemDto, AppError> {
    let connection = open_connection(db_path)?;
    let history_id = generate_id("history");
    let request_snapshot_json = serialize_json(&payload.request_snapshot, "history request snapshot")?;
    let headers_json = serialize_json(&payload.response_headers, "history response headers")?;

    connection
        .execute(
            "INSERT INTO history_items
             (id, workspace_id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, executed_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                history_id,
                workspace_id,
                payload.request_id,
                payload.request_name,
                payload.request_method,
                payload.request_url,
                request_snapshot_json,
                payload.status,
                payload.status_text,
                i64::try_from(payload.elapsed_ms).unwrap_or(i64::MAX),
                i64::try_from(payload.size_bytes).unwrap_or(i64::MAX),
                payload.content_type,
                headers_json,
                payload.response_preview,
                if payload.truncated { 1 } else { 0 },
                i64::try_from(payload.executed_at_epoch_ms).unwrap_or(i64::MAX)
            ],
        )
        .map_err(|err| db_error("failed to insert history item", Some(err.to_string())))?;
    touch_workspace(&connection, workspace_id)?;
    load_history_item_with_connection(&connection, &history_id)
}

fn next_sort_order(
    connection: &Connection,
    table: &str,
    foreign_key: &str,
    foreign_value: &str,
) -> Result<i64, AppError> {
    let sql = format!("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM {table} WHERE {foreign_key} = ?1");
    connection
        .query_row(sql.as_str(), params![foreign_value], |row| row.get(0))
        .map_err(|err| db_error("failed to compute sort order", Some(err.to_string())))
}

fn touch_workspace(connection: &Connection, workspace_id: &str) -> Result<(), AppError> {
    connection
        .execute(
            "UPDATE workspaces SET updated_at_epoch_ms = ?1 WHERE id = ?2",
            params![now_epoch_ms(), workspace_id],
        )
        .map_err(|err| db_error("failed to update workspace timestamp", Some(err.to_string())))?;
    Ok(())
}

fn load_workspace_session_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Option<WorkspaceSessionDto>, AppError> {
    let raw = connection
        .query_row(
            "SELECT active_tab_id, active_environment_id, tabs_json FROM workspace_sessions WHERE workspace_id = ?1",
            params![workspace_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|err| db_error("failed to load workspace session", Some(err.to_string())))?;

    raw.map(|(active_tab_id, active_environment_id, tabs_json)| {
        let open_tabs = deserialize_json::<Vec<RequestTabStateDto>>(&tabs_json, "workspace tabs")?;
        Ok(WorkspaceSessionDto {
            active_tab_id,
            active_environment_id,
            open_tabs,
        })
    })
    .transpose()
}

fn load_request_with_collection_name(
    connection: &Connection,
    request_id: &str,
) -> Result<RequestPresetDto, AppError> {
    connection
        .query_row(
            "SELECT r.id, r.workspace_id, r.collection_id, c.name, r.name, r.description, r.tags_json, r.method, r.url, r.params_json, r.headers_json, r.body, r.body_type, r.auth_json, r.tests_json
             FROM requests r
             JOIN collections c ON c.id = r.collection_id
             WHERE r.id = ?1",
            params![request_id],
            map_request_row,
        )
        .map_err(|err| db_error("failed to load request", Some(err.to_string())))
}

fn map_request_row(row: &Row<'_>) -> rusqlite::Result<RequestPresetDto> {
    let tags_json: String = row.get(6)?;
    let params_json: String = row.get(9)?;
    let headers_json: String = row.get(10)?;
    let auth_json: String = row.get(13)?;
    let tests_json: String = row.get(14)?;

    Ok(RequestPresetDto {
        id: row.get(0)?,
        workspace_id: Some(row.get(1)?),
        collection_id: Some(row.get(2)?),
        collection_name: Some(row.get(3)?),
        name: row.get(4)?,
        description: row.get(5)?,
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
        method: row.get(7)?,
        url: row.get(8)?,
        params: serde_json::from_str(&params_json).unwrap_or_default(),
        headers: serde_json::from_str(&headers_json).unwrap_or_default(),
        body: row.get(11)?,
        body_type: row.get(12)?,
        auth: serde_json::from_str(&auth_json).unwrap_or_default(),
        tests: serde_json::from_str(&tests_json).unwrap_or_default(),
    })
}

fn load_collection_with_requests(
    connection: &Connection,
    workspace_id: &str,
    collection_id: &str,
) -> Result<RequestCollectionDto, AppError> {
    let mut collections = load_collections_with_connection(connection, workspace_id)?;
    let found = collections
        .drain(..)
        .find(|collection| collection.id == collection_id);
    found.ok_or_else(|| db_error("collection not found", Some(collection_id.to_string())))
}

fn load_collections_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<RequestCollectionDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, expanded
             FROM collections
             WHERE workspace_id = ?1
             ORDER BY sort_order ASC, created_at_epoch_ms ASC",
        )
        .map_err(|err| db_error("failed to prepare collection query", Some(err.to_string())))?;

    let rows = statement
        .query_map(params![workspace_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)? != 0,
            ))
        })
        .map_err(|err| db_error("failed to query collections", Some(err.to_string())))?;

    let mut collections = Vec::new();
    for row in rows {
        let (id, name, expanded) =
            row.map_err(|err| db_error("failed to map collection row", Some(err.to_string())))?;
        let mut request_statement = connection
            .prepare(
                "SELECT r.id, r.workspace_id, r.collection_id, c.name, r.name, r.description, r.tags_json, r.method, r.url, r.params_json, r.headers_json, r.body, r.body_type, r.auth_json
                 , r.tests_json
                 FROM requests r
                 JOIN collections c ON c.id = r.collection_id
                 WHERE r.collection_id = ?1
                 ORDER BY r.sort_order ASC, r.created_at_epoch_ms ASC",
            )
            .map_err(|err| db_error("failed to prepare request query", Some(err.to_string())))?;

        let request_rows = request_statement
            .query_map(params![id.clone()], map_request_row)
            .map_err(|err| db_error("failed to query requests", Some(err.to_string())))?;

        let mut requests = Vec::new();
        for request_row in request_rows {
            requests.push(
                request_row
                    .map_err(|err| db_error("failed to map request row", Some(err.to_string())))?,
            );
        }

        collections.push(RequestCollectionDto {
            id,
            name,
            expanded,
            requests,
        });
    }

    Ok(collections)
}

fn load_environment_with_connection(
    connection: &Connection,
    workspace_id: &str,
    environment_id: &str,
) -> Result<EnvironmentDto, AppError> {
    let environments = load_environments_with_connection(connection, workspace_id)?;
    environments
        .into_iter()
        .find(|environment| environment.id == environment_id)
        .ok_or_else(|| db_error("environment not found", Some(environment_id.to_string())))
}

fn load_environments_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<EnvironmentDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, variables_json
             FROM environments
             WHERE workspace_id = ?1
             ORDER BY updated_at_epoch_ms DESC, created_at_epoch_ms DESC",
        )
        .map_err(|err| db_error("failed to prepare environment query", Some(err.to_string())))?;

    let rows = statement
        .query_map(params![workspace_id], |row| {
            let variables_json: String = row.get(2)?;
            let variables = serde_json::from_str(&variables_json).unwrap_or_default();
            Ok(EnvironmentDto {
                id: row.get(0)?,
                name: row.get(1)?,
                variables,
            })
        })
        .map_err(|err| db_error("failed to query environments", Some(err.to_string())))?;

    let mut environments = Vec::new();
    for row in rows {
        environments.push(
            row.map_err(|err| db_error("failed to map environment row", Some(err.to_string())))?,
        );
    }
    Ok(environments)
}

fn load_history_item_with_connection(
    connection: &Connection,
    history_id: &str,
) -> Result<HistoryItemDto, AppError> {
    connection
        .query_row(
            "SELECT id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, executed_at_epoch_ms
             FROM history_items
             WHERE id = ?1",
            params![history_id],
            map_history_row,
        )
        .map_err(|err| db_error("failed to load history item", Some(err.to_string())))
}

fn load_history_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<HistoryItemDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, executed_at_epoch_ms
             FROM history_items
             WHERE workspace_id = ?1
             ORDER BY executed_at_epoch_ms DESC",
        )
        .map_err(|err| db_error("failed to prepare history query", Some(err.to_string())))?;

    let rows = statement
        .query_map(params![workspace_id], map_history_row)
        .map_err(|err| db_error("failed to query history", Some(err.to_string())))?;

    let mut history = Vec::new();
    for row in rows {
        history.push(row.map_err(|err| db_error("failed to map history row", Some(err.to_string())))?);
    }
    Ok(history)
}

fn load_history_export_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<WorkspaceHistoryExportItemDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, executed_at_epoch_ms
             FROM history_items
             WHERE workspace_id = ?1
             ORDER BY executed_at_epoch_ms DESC",
        )
        .map_err(|err| db_error("failed to prepare history export query", Some(err.to_string())))?;

    let rows = statement
        .query_map(params![workspace_id], |row| {
            let request_snapshot_json: String = row.get(5)?;
            let response_headers_json: String = row.get(11)?;
            let executed_at_epoch_ms: i64 = row.get(14)?;

            Ok(WorkspaceHistoryExportItemDto {
                id: row.get(0)?,
                request_id: row.get(1)?,
                request_name: row.get(2)?,
                request_method: row.get(3)?,
                request_url: row.get(4)?,
                request_snapshot: serde_json::from_str(&request_snapshot_json).unwrap_or_default(),
                status: row.get(6)?,
                status_text: row.get(7)?,
                elapsed_ms: row.get::<_, i64>(8)? as u64,
                size_bytes: row.get::<_, i64>(9)? as usize,
                content_type: row.get(10)?,
                response_headers: serde_json::from_str(&response_headers_json).unwrap_or_default(),
                response_preview: row.get(12)?,
                truncated: row.get::<_, i64>(13)? != 0,
                executed_at_epoch_ms: executed_at_epoch_ms as u64,
            })
        })
        .map_err(|err| db_error("failed to query history export", Some(err.to_string())))?;

    let mut history = Vec::new();
    for row in rows {
        history.push(
            row.map_err(|err| db_error("failed to map history export row", Some(err.to_string())))?,
        );
    }
    Ok(history)
}

fn map_history_row(row: &Row<'_>) -> rusqlite::Result<HistoryItemDto> {
    let request_snapshot_json: String = row.get(5)?;
    let response_headers_json: String = row.get(11)?;
    let executed_at_epoch_ms: i64 = row.get(14)?;
    Ok(HistoryItemDto {
        id: row.get(0)?,
        request_id: row.get(1)?,
        name: row.get(2)?,
        method: row.get(3)?,
        url: row.get(4)?,
        request_snapshot: serde_json::from_str(&request_snapshot_json).ok(),
        status: row.get(6)?,
        status_text: row.get(7)?,
        elapsed_ms: row.get::<_, i64>(8)? as u64,
        size_bytes: row.get::<_, i64>(9)? as usize,
        content_type: row.get(10)?,
        response_headers: serde_json::from_str(&response_headers_json).unwrap_or_default(),
        response_preview: row.get(12)?,
        truncated: row.get::<_, i64>(13)? != 0,
        executed_at_epoch_ms: executed_at_epoch_ms as u64,
        time: format_history_time(executed_at_epoch_ms),
    })
}

fn seed_demo_workspace_with_connection(connection: &Connection) -> Result<WorkspaceSummaryDto, AppError> {
    let workspace = create_workspace_record(connection, "Demo Workspace", Some("system-demo"))?;

    let local_environment = EnvironmentDto {
        id: generate_id("env"),
        name: "Local".to_string(),
        variables: vec![
            crate::models::KeyValueItemDto {
                key: "baseUrl".to_string(),
                value: "https://jsonplaceholder.typicode.com".to_string(),
                description: "Primary API host".to_string(),
                enabled: true,
            },
            crate::models::KeyValueItemDto {
                key: "token".to_string(),
                value: "demo-token-123".to_string(),
                description: "Bearer token".to_string(),
                enabled: true,
            },
        ],
    };

    let variables_json = serialize_json(&local_environment.variables, "environment variables")?;
    let timestamp = now_epoch_ms();
    connection.execute(
        "INSERT INTO environments (id, workspace_id, name, variables_json, created_at_epoch_ms, updated_at_epoch_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![local_environment.id, workspace.id, local_environment.name, variables_json, timestamp, timestamp],
    ).map_err(|err| db_error("failed to seed environment", Some(err.to_string())))?;

    let collection = RequestCollectionDto {
        id: generate_id("collection"),
        name: "Demo APIs".to_string(),
        expanded: true,
        requests: vec![
            RequestPresetDto {
                id: generate_id("request"),
                workspace_id: Some(workspace.id.clone()),
                collection_id: None,
                collection_name: Some("Demo APIs".to_string()),
                name: "GET /todos/1".to_string(),
                description: "Fetch the sample todo record.".to_string(),
                tags: vec!["demo".to_string(), "todos".to_string()],
                method: "GET".to_string(),
                url: "{{baseUrl}}/todos/1".to_string(),
                params: Vec::new(),
                headers: vec![crate::models::KeyValueItemDto {
                    key: "Accept".to_string(),
                    value: "application/json".to_string(),
                    description: String::new(),
                    enabled: true,
                }],
                body: String::new(),
                body_type: "json".to_string(),
                auth: crate::models::AuthConfigDto::default(),
                tests: Vec::new(),
            },
            RequestPresetDto {
                id: generate_id("request"),
                workspace_id: Some(workspace.id.clone()),
                collection_id: None,
                collection_name: Some("Demo APIs".to_string()),
                name: "POST /posts".to_string(),
                description: "Create a sample post payload.".to_string(),
                tags: vec!["demo".to_string(), "posts".to_string()],
                method: "POST".to_string(),
                url: "{{baseUrl}}/posts".to_string(),
                params: Vec::new(),
                headers: vec![crate::models::KeyValueItemDto {
                    key: "Content-Type".to_string(),
                    value: "application/json".to_string(),
                    description: String::new(),
                    enabled: true,
                }],
                body: "{\n  \"title\": \"hello\",\n  \"body\": \"world\",\n  \"userId\": 1\n}".to_string(),
                body_type: "json".to_string(),
                auth: crate::models::AuthConfigDto::default(),
                tests: Vec::new(),
            },
        ],
    };

    connection.execute(
        "INSERT INTO collections (id, workspace_id, name, description, expanded, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
         VALUES (?1, ?2, ?3, '', 1, 0, ?4, ?5)",
        params![collection.id, workspace.id, collection.name, timestamp, timestamp],
    ).map_err(|err| db_error("failed to seed collection", Some(err.to_string())))?;

    for (index, request) in collection.requests.iter().enumerate() {
        let tags_json = serialize_json(&request.tags, "request tags")?;
        let params_json = serialize_json(&request.params, "request params")?;
        let headers_json = serialize_json(&request.headers, "request headers")?;
        let auth_json = serialize_json(&request.auth, "request auth")?;
        let tests_json = serialize_json(&request.tests, "request tests")?;
        connection.execute(
            "INSERT INTO requests
             (id, workspace_id, collection_id, name, description, tags_json, method, url, params_json, headers_json, body, body_type, auth_json, tests_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                request.id,
                workspace.id,
                collection.id,
                request.name,
                request.description,
                tags_json,
                request.method,
                request.url,
                params_json,
                headers_json,
                request.body,
                request.body_type,
                auth_json,
                tests_json,
                i64::try_from(index).unwrap_or(0),
                timestamp,
                timestamp
            ],
        ).map_err(|err| db_error("failed to seed request", Some(err.to_string())))?;
    }

    let session = WorkspaceSessionDto {
        active_tab_id: Some(generate_id("tab")),
        active_environment_id: Some(local_environment.id),
        open_tabs: vec![RequestTabStateDto {
            id: generate_id("tab"),
            request_id: Some(collection.requests[0].id.clone()),
            name: collection.requests[0].name.clone(),
            description: collection.requests[0].description.clone(),
            tags: collection.requests[0].tags.clone(),
            collection_name: collection.name.clone(),
            collection_id: Some(collection.id.clone()),
            method: collection.requests[0].method.clone(),
            url: collection.requests[0].url.clone(),
            params: collection.requests[0].params.clone(),
            headers: collection.requests[0].headers.clone(),
            body: collection.requests[0].body.clone(),
            body_type: collection.requests[0].body_type.clone(),
            auth: collection.requests[0].auth.clone(),
            tests: collection.requests[0].tests.clone(),
            response: crate::models::ResponseStateDto::default(),
            is_sending: false,
            is_dirty: false,
        }],
    };
    save_workspace_session_in_connection(connection, &workspace.id, &session)?;
    Ok(workspace)
}

fn save_workspace_session_in_connection(
    connection: &Connection,
    workspace_id: &str,
    session: &WorkspaceSessionDto,
) -> Result<(), AppError> {
    let tabs_json = serialize_json(&session.open_tabs, "workspace tabs")?;
    connection.execute(
        "UPDATE workspace_sessions
         SET active_tab_id = ?1, active_environment_id = ?2, tabs_json = ?3, updated_at_epoch_ms = ?4
         WHERE workspace_id = ?5",
        params![
            session.active_tab_id,
            session.active_environment_id,
            tabs_json,
            now_epoch_ms(),
            workspace_id
        ],
    ).map_err(|err| db_error("failed to save workspace session", Some(err.to_string())))?;
    Ok(())
}

fn migrate_legacy_snapshot_with_connection(
    connection: &Connection,
    snapshot: &LegacyWorkspaceSnapshotDto,
) -> Result<WorkspaceSummaryDto, AppError> {
    let workspace = create_workspace_record(connection, "Imported Workspace", None)?;
    let timestamp = now_epoch_ms();

    for environment in &snapshot.environments {
        let variables_json = serialize_json(&environment.variables, "environment variables")?;
        connection.execute(
            "INSERT INTO environments (id, workspace_id, name, variables_json, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                if environment.id.is_empty() { generate_id("env") } else { environment.id.clone() },
                workspace.id,
                environment.name,
                variables_json,
                timestamp,
                timestamp
            ],
        ).map_err(|err| db_error("failed to migrate environment", Some(err.to_string())))?;
    }

    for (collection_index, collection) in snapshot.collections.iter().enumerate() {
        let collection_id = if collection.id.is_empty() {
            generate_id("collection")
        } else {
            collection.id.clone()
        };
        connection.execute(
            "INSERT INTO collections (id, workspace_id, name, description, expanded, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, '', ?4, ?5, ?6, ?7)",
            params![
                collection_id,
                workspace.id,
                collection.name,
                if collection.expanded { 1 } else { 0 },
                i64::try_from(collection_index).unwrap_or(0),
                timestamp,
                timestamp
            ],
        ).map_err(|err| db_error("failed to migrate collection", Some(err.to_string())))?;

        for (request_index, request) in collection.requests.iter().enumerate() {
            let tags_json = serialize_json(&request.tags, "request tags")?;
            let params_json = serialize_json(&request.params, "request params")?;
            let headers_json = serialize_json(&request.headers, "request headers")?;
            let auth_json = serialize_json(&request.auth, "request auth")?;
            let tests_json = serialize_json(&request.tests, "request tests")?;
            connection.execute(
                "INSERT INTO requests
                 (id, workspace_id, collection_id, name, description, tags_json, method, url, params_json, headers_json, body, body_type, auth_json, tests_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                params![
                    if request.id.is_empty() { generate_id("request") } else { request.id.clone() },
                    workspace.id,
                    collection_id,
                    request.name,
                    request.description,
                    tags_json,
                    request.method,
                    request.url,
                    params_json,
                    headers_json,
                    request.body,
                    request.body_type,
                    auth_json,
                    tests_json,
                    i64::try_from(request_index).unwrap_or(0),
                    timestamp,
                    timestamp
                ],
            ).map_err(|err| db_error("failed to migrate request", Some(err.to_string())))?;
        }
    }

    for history_item in &snapshot.history_items {
        let request_snapshot = SendRequestPayloadDto {
            workspace_id: workspace.id.clone(),
            tab_id: generate_id("tab"),
            request_id: history_item.request_id.clone(),
            name: history_item.name.clone(),
            description: String::new(),
            tags: Vec::new(),
            collection_name: String::new(),
            method: history_item.method.clone(),
            url: history_item.url.clone(),
            params: Vec::new(),
            headers: Vec::new(),
            body: crate::models::RequestBodyDto::Raw {
                value: String::new(),
                content_type: None,
            },
            auth: crate::models::AuthConfigDto::default(),
            tests: Vec::new(),
        };
        let stored = HistoryStoredPayloadDto {
            request_id: history_item.request_id.clone(),
            request_name: history_item.name.clone(),
            request_method: history_item.method.clone(),
            request_url: history_item.url.clone(),
            request_snapshot,
            status: history_item.status,
            status_text: history_item.status_text.clone(),
            elapsed_ms: history_item.elapsed_ms,
            size_bytes: history_item.size_bytes,
            content_type: history_item.content_type.clone(),
            response_headers: Vec::new(),
            response_preview: String::new(),
            truncated: history_item.truncated,
            executed_at_epoch_ms: if history_item.executed_at_epoch_ms == 0 {
                u64::try_from(timestamp).unwrap_or_default()
            } else {
                history_item.executed_at_epoch_ms
            },
        };
        let _ = insert_history_item_in_connection(connection, &workspace.id, &stored)?;
    }

    let session = WorkspaceSessionDto {
        active_tab_id: snapshot.active_tab_id.clone(),
        active_environment_id: snapshot.active_environment_id.clone(),
        open_tabs: snapshot.open_tabs.clone(),
    };
    save_workspace_session_in_connection(connection, &workspace.id, &session)?;
    Ok(workspace)
}

fn insert_history_item_in_connection(
    connection: &Connection,
    workspace_id: &str,
    payload: &HistoryStoredPayloadDto,
) -> Result<HistoryItemDto, AppError> {
    let history_id = generate_id("history");
    let request_snapshot_json = serialize_json(&payload.request_snapshot, "history request snapshot")?;
    let headers_json = serialize_json(&payload.response_headers, "history response headers")?;

    connection.execute(
        "INSERT INTO history_items
         (id, workspace_id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, executed_at_epoch_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            history_id,
            workspace_id,
            payload.request_id,
            payload.request_name,
            payload.request_method,
            payload.request_url,
            request_snapshot_json,
            payload.status,
            payload.status_text,
            i64::try_from(payload.elapsed_ms).unwrap_or(i64::MAX),
            i64::try_from(payload.size_bytes).unwrap_or(i64::MAX),
            payload.content_type,
            headers_json,
            payload.response_preview,
            if payload.truncated { 1 } else { 0 },
            i64::try_from(payload.executed_at_epoch_ms).unwrap_or(i64::MAX)
        ],
    ).map_err(|err| db_error("failed to insert history item", Some(err.to_string())))?;
    load_history_item_with_connection(connection, &history_id)
}

#[cfg(test)]
mod tests {
    use super::{
        ensure_bootstrap_data, export_application_package, export_workspace_package,
        import_application_package, import_workspace_package, initialize_database,
        insert_history_item, list_workspaces, load_collections_with_connection,
        load_environments_with_connection, load_history_export_with_connection,
        load_workspace_session_with_connection, open_connection, save_workspace_session,
    };
    use crate::models::{
        HistoryStoredPayloadDto, ImportConflictStrategy, KeyValueItemDto,
        LegacyWorkspaceSnapshotDto, RequestBodyDto, RequestCollectionDto, RequestPresetDto,
        SaveWorkspacePayloadDto, SendRequestPayloadDto, WorkspaceSessionDto,
    };
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

    #[test]
    fn bootstrap_seeds_demo_workspace_when_empty() {
        let db_path = temp_db_path("demo");
        initialize_database(&db_path).expect("database initialized");

        let payload = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        assert_eq!(payload.workspaces.len(), 1);
        assert_eq!(payload.workspaces[0].name, "Demo Workspace");
        assert!(!payload.collections.is_empty());
        assert!(!payload.environments.is_empty());

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn bootstrap_migrates_legacy_snapshot_instead_of_demo_seed() {
        let db_path = temp_db_path("legacy");
        initialize_database(&db_path).expect("database initialized");

        let legacy = LegacyWorkspaceSnapshotDto {
            locale: "en".to_string(),
            theme_mode: "dark".to_string(),
            active_environment_id: None,
            environments: Vec::new(),
            collections: vec![RequestCollectionDto {
                id: String::new(),
                name: "Imported Collection".to_string(),
                expanded: true,
                requests: vec![RequestPresetDto {
                    id: String::new(),
                    name: "GET /health".to_string(),
                    description: String::new(),
                    tags: Vec::new(),
                    method: "GET".to_string(),
                    url: "https://example.com/health".to_string(),
                    workspace_id: None,
                    collection_id: None,
                    collection_name: Some("Imported Collection".to_string()),
                    params: Vec::new(),
                    headers: Vec::new(),
                    body: String::new(),
                    body_type: "json".to_string(),
                    auth: Default::default(),
                    tests: Vec::new(),
                }],
            }],
            history_items: Vec::new(),
            open_tabs: Vec::new(),
            active_tab_id: None,
        };

        let payload = ensure_bootstrap_data(&db_path, Some(legacy)).expect("bootstrap payload");
        assert_eq!(payload.workspaces.len(), 1);
        assert_eq!(payload.workspaces[0].name, "Imported Workspace");
        assert_eq!(payload.collections.len(), 1);
        assert_eq!(payload.collections[0].name, "Imported Collection");

        let persisted = list_workspaces(&db_path).expect("workspaces listed");
        assert_eq!(persisted.len(), 1);
        assert_eq!(persisted[0].name, "Imported Workspace");

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn export_import_roundtrip_preserves_workspace_shape() {
        let db_path = temp_db_path("roundtrip");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");
        let environment_id = bootstrap.environments[0].id.clone();
        let request = bootstrap.collections[0].requests[0].clone();

        save_workspace_session(
            &db_path,
            &SaveWorkspacePayloadDto {
                workspace_id: workspace_id.clone(),
                session: WorkspaceSessionDto {
                    active_tab_id: Some("tab-import-test".to_string()),
                    active_environment_id: Some(environment_id.clone()),
                    open_tabs: vec![crate::models::RequestTabStateDto {
                        id: "tab-import-test".to_string(),
                        request_id: Some(request.id.clone()),
                        name: request.name.clone(),
                        description: request.description.clone(),
                        tags: request.tags.clone(),
                        collection_name: request.collection_name.clone().unwrap_or_default(),
                        collection_id: request.collection_id.clone(),
                        method: request.method.clone(),
                        url: request.url.clone(),
                        params: request.params.clone(),
                        headers: request.headers.clone(),
                        body: request.body.clone(),
                        body_type: request.body_type.clone(),
                        auth: request.auth.clone(),
                        tests: request.tests.clone(),
                        response: crate::models::ResponseStateDto::default(),
                        is_sending: false,
                        is_dirty: false,
                    }],
                },
            },
        )
        .expect("session saved");

        let history = HistoryStoredPayloadDto {
            request_id: Some(request.id.clone()),
            request_name: request.name.clone(),
            request_method: request.method.clone(),
            request_url: request.url.clone(),
            request_snapshot: SendRequestPayloadDto {
                workspace_id: workspace_id.clone(),
                tab_id: "tab-import-test".to_string(),
                request_id: Some(request.id.clone()),
                name: request.name.clone(),
                description: request.description.clone(),
                tags: request.tags.clone(),
                collection_name: request.collection_name.clone().unwrap_or_default(),
                method: request.method.clone(),
                url: request.url.clone(),
                params: request.params.clone(),
                headers: vec![KeyValueItemDto {
                    key: "Authorization".to_string(),
                    value: "[REDACTED]".to_string(),
                    description: String::new(),
                    enabled: true,
                }],
                body: RequestBodyDto::Raw {
                    value: String::new(),
                    content_type: None,
                },
                auth: request.auth.clone(),
                tests: request.tests.clone(),
            },
            status: 200,
            status_text: "OK".to_string(),
            elapsed_ms: 12,
            size_bytes: 128,
            content_type: "application/json".to_string(),
            response_headers: vec![crate::models::ResponseHeaderItemDto {
                key: "content-type".to_string(),
                value: "application/json".to_string(),
            }],
            response_preview: "{\"ok\":true}".to_string(),
            truncated: false,
            executed_at_epoch_ms: 1_717_171_717_000,
        };
        insert_history_item(&db_path, &workspace_id, &history).expect("history inserted");

        let export = export_workspace_package(&db_path, &workspace_id).expect("workspace exported");
        let imported = import_workspace_package(&db_path, &export, ImportConflictStrategy::Rename)
            .expect("workspace imported");

        assert_eq!(export.format_version, 1);
        assert_eq!(imported.scope, crate::models::ExportPackageScopeDto::Workspace);
        assert_eq!(imported.workspace.name, "Demo Workspace (Imported)");

        let workspaces = list_workspaces(&db_path).expect("workspaces listed");
        assert_eq!(workspaces.len(), 2);

        let connection = open_connection(&db_path).expect("connection opened");
        let imported_collections =
            load_collections_with_connection(&connection, &imported.workspace.id).expect("collections loaded");
        let imported_environments =
            load_environments_with_connection(&connection, &imported.workspace.id).expect("environments loaded");
        let imported_history =
            load_history_export_with_connection(&connection, &imported.workspace.id).expect("history loaded");
        let imported_session = load_workspace_session_with_connection(&connection, &imported.workspace.id)
            .expect("session query")
            .expect("session exists");

        assert_eq!(imported_collections.len(), export.collections.len());
        assert_eq!(imported_environments.len(), export.environments.len());
        assert_eq!(imported_history.len(), export.history.len());
        assert_eq!(imported_history[0].response_preview, "{\"ok\":true}");

        let imported_request_id = imported_collections[0].requests[0].id.clone();
        let imported_environment_id = imported_environments[0].id.clone();
        assert_eq!(imported_session.active_environment_id, Some(imported_environment_id));
        assert_eq!(
            imported_session.open_tabs[0].request_id,
            Some(imported_request_id.clone())
        );
        assert_eq!(imported_history[0].request_id, Some(imported_request_id));

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn import_skip_strategy_leaves_existing_workspace_unchanged() {
        let db_path = temp_db_path("skip");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap.active_workspace_id.expect("active workspace id");
        let export = export_workspace_package(&db_path, &workspace_id).expect("workspace exported");

        let error = import_workspace_package(&db_path, &export, ImportConflictStrategy::Skip)
            .expect_err("import should skip");
        assert_eq!(error.code, "DB_ERROR");
        assert!(error.message.contains("skipped"));

        let workspaces = list_workspaces(&db_path).expect("workspaces listed");
        assert_eq!(workspaces.len(), 1);

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn application_export_import_roundtrip_restores_settings_and_active_workspace() {
        let db_path = temp_db_path("application-roundtrip");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap.active_workspace_id.expect("active workspace id");

        super::create_workspace(
            &db_path,
            &crate::models::CreateWorkspacePayloadDto {
                name: "Second Workspace".to_string(),
            },
        )
        .expect("second workspace created");

        super::save_settings(
            &db_path,
            &crate::models::AppSettings {
                theme_mode: "light".to_string(),
                locale: "zh-CN".to_string(),
            },
        )
        .expect("settings saved");

        let export = export_application_package(&db_path).expect("application exported");
        assert_eq!(export.scope, crate::models::ExportPackageScopeDto::Application);
        assert_eq!(export.workspaces.len(), 2);
        assert_eq!(export.active_workspace_id, Some(workspace_id));

        let imported = import_application_package(&db_path, &export, ImportConflictStrategy::Rename)
            .expect("application imported");

        assert_eq!(imported.scope, crate::models::ExportPackageScopeDto::Application);
        assert_eq!(imported.imported_workspace_count, 2);
        assert_eq!(imported.workspace.name, "Demo Workspace (Imported)");

        let refreshed = ensure_bootstrap_data(&db_path, None).expect("bootstrap refreshed");
        assert_eq!(refreshed.settings.theme_mode, "light");
        assert_eq!(refreshed.settings.locale, "zh-CN");
        assert_eq!(refreshed.workspaces.len(), 4);
        assert_eq!(refreshed.active_workspace_id, imported.active_workspace_id);

        let _ = fs::remove_file(db_path);
    }
}
