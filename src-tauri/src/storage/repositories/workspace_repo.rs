use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::path::Path;

use crate::errors::AppError;
use crate::models::{
    AppBootstrapPayload, AppSettings, ApplicationExportPackageDto, AuthConfigDto,
    RecoveryNoticeDto,
    CreateWorkspacePayloadDto, DeleteWorkspacePayloadDto, EnvironmentDto,
    ExportPackageScopeDto, HistoryItemDto, HistoryStoredPayloadDto, ImportConflictStrategy,
    KeyValueItemDto, LegacyWorkspaceSnapshotDto, RequestCollectionDto,
    RequestExecutionOptionsDto, RequestPresetDto, RequestTabStateDto, SaveWorkspacePayloadDto,
    SendRequestPayloadDto, SetActiveWorkspacePayloadDto, WorkspaceExportDataDto,
    WorkspaceExportPackageDto, WorkspaceHistoryExportItemDto, WorkspaceSessionDto,
    WorkspaceSummaryDto,
};
use crate::storage::connection::{
    db_error, deserialize_json, generate_id, now_epoch_ms, open_connection, serialize_json,
};
use crate::storage::repositories::collection_repo::load_collections_with_connection;
use crate::storage::repositories::environment_repo::load_environments_with_connection;
use crate::storage::repositories::history_repo::{
    derive_replay_explainability, insert_history_item_in_connection, load_history_export_with_connection,
    load_history_with_connection,
};
use crate::storage::repositories::settings_repo::{
    load_settings_with_connection, save_settings_with_connection,
};


const ACTIVE_WORKSPACE_KEY: &str = "active_workspace_id";
const REDACTED_SECRET_VALUE: &str = "[REDACTED]";

fn should_redact_secret_key(key: &str) -> bool {
    let lower = key.trim().to_ascii_lowercase();
    lower.contains("token")
        || lower.contains("secret")
        || lower.contains("password")
        || lower.contains("cookie")
        || lower.contains("api_key")
        || lower.contains("api-key")
        || lower.contains("apikey")
        || lower == "authorization"
}

fn redact_key_value_item(item: &KeyValueItemDto) -> KeyValueItemDto {
    let mut next = item.clone();
    if should_redact_secret_key(&next.key) && !next.value.trim().is_empty() {
        next.value = REDACTED_SECRET_VALUE.to_string();
    }
    next
}

fn redact_auth(auth: &AuthConfigDto) -> AuthConfigDto {
    let mut next = auth.clone();
    if !next.bearer_token.trim().is_empty() {
        next.bearer_token = REDACTED_SECRET_VALUE.to_string();
    }
    if !next.username.trim().is_empty() && should_redact_secret_key("username") {
        next.username = REDACTED_SECRET_VALUE.to_string();
    }
    if !next.password.trim().is_empty() {
        next.password = REDACTED_SECRET_VALUE.to_string();
    }
    if !next.api_key_value.trim().is_empty() {
        next.api_key_value = REDACTED_SECRET_VALUE.to_string();
    }
    next
}

fn redact_request_preset(request: &RequestPresetDto) -> RequestPresetDto {
    let mut next = request.clone();
    next.headers = request.headers.iter().map(redact_key_value_item).collect();
    next.auth = redact_auth(&request.auth);
    next
}

fn redact_request_snapshot(snapshot: &SendRequestPayloadDto) -> SendRequestPayloadDto {
    let mut next = snapshot.clone();
    next.headers = snapshot.headers.iter().map(redact_key_value_item).collect();
    next.auth = redact_auth(&snapshot.auth);
    next
}

fn redact_request_tab(tab: &RequestTabStateDto) -> RequestTabStateDto {
    let mut next = tab.clone();
    next.headers = tab.headers.iter().map(redact_key_value_item).collect();
    next.auth = redact_auth(&tab.auth);
    next
}

fn redact_environment(environment: &EnvironmentDto) -> EnvironmentDto {
    let mut next = environment.clone();
    next.variables = environment.variables.iter().map(redact_key_value_item).collect();
    next
}

fn redact_history_item(item: &WorkspaceHistoryExportItemDto) -> WorkspaceHistoryExportItemDto {
    let mut next = item.clone();
    next.request_snapshot = redact_request_snapshot(&item.request_snapshot);
    next
}

fn redact_bootstrap_history_item(item: &HistoryItemDto) -> HistoryItemDto {
    let mut next = item.clone();
    next.request_snapshot = item
        .request_snapshot
        .as_ref()
        .map(redact_request_snapshot);
    next.explainability = next
        .request_snapshot
        .as_ref()
        .and_then(derive_replay_explainability)
        .or(next.explainability);
    next
}

fn redact_workspace_export_data(data: WorkspaceExportDataDto) -> WorkspaceExportDataDto {
    WorkspaceExportDataDto {
        workspace: data.workspace,
        session: data.session.map(|session| WorkspaceSessionDto {
            active_tab_id: session.active_tab_id,
            active_environment_id: session.active_environment_id,
            open_tabs: session.open_tabs.iter().map(redact_request_tab).collect(),
        }),
        collections: data
            .collections
            .iter()
            .map(|collection| {
                let mut next = collection.clone();
                next.requests = collection.requests.iter().map(redact_request_preset).collect();
                next
            })
            .collect(),
        environments: data.environments.iter().map(redact_environment).collect(),
        history: data.history.iter().map(redact_history_item).collect(),
    }
}

pub fn set_active_workspace(
    db_path: &Path,
    payload: &SetActiveWorkspacePayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    update_active_workspace_in_connection(&connection, Some(&payload.workspace_id))
}

pub fn list_workspaces(db_path: &Path) -> Result<Vec<WorkspaceSummaryDto>, AppError> {
    let connection = open_connection(db_path)?;
    list_workspaces_with_connection(&connection)
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

pub fn ensure_bootstrap_data(
    db_path: &Path,
    legacy_snapshot: Option<LegacyWorkspaceSnapshotDto>,
) -> Result<AppBootstrapPayload, AppError> {
    let mut recovery_notices = Vec::new();
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
                save_settings_with_connection(&connection, &next_settings)?;
            }
        } else {
            let demo = seed_demo_workspace_with_connection(&connection)?;
            update_active_workspace_in_connection(&connection, Some(&demo.id))?;
        }
    }

    let settings = load_settings_with_connection(&connection)?.unwrap_or_default();
    let workspaces = list_workspaces_with_connection(&connection)?;
    let active_workspace_id = load_active_workspace_id(&connection)?
        .or_else(|| workspaces.first().map(|item| item.id.clone()));

    if let Some(active_id) = active_workspace_id.as_deref() {
        update_active_workspace_in_connection(&connection, Some(active_id))?;
    }

    let session = match active_workspace_id.as_deref() {
        Some(workspace_id) => match load_workspace_session_with_connection(&connection, workspace_id) {
            Ok(value) => value,
            Err(_) => {
                recovery_notices.push(RecoveryNoticeDto {
                    severity: "warning".to_string(),
                    scope: "workspace_session".to_string(),
                    diagnostic_key: Some("workspace_session_corrupted".to_string()),
                    message: "Saved workspace session data was corrupted and was ignored. ZenRequest restored from more reliable persisted state where possible.".to_string(),
                });
                None
            }
        },
        None => None,
    };
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

    let session = session.map(|session| WorkspaceSessionDto {
        active_tab_id: session.active_tab_id,
        active_environment_id: session.active_environment_id,
        open_tabs: session.open_tabs.iter().map(redact_request_tab).collect(),
    });
    let collections = collections
        .iter()
        .map(|collection| {
            let mut next = collection.clone();
            next.requests = collection.requests.iter().map(redact_request_preset).collect();
            next
        })
        .collect();
    let environments = environments.iter().map(redact_environment).collect();
    let history = history.iter().map(redact_bootstrap_history_item).collect();

    Ok(AppBootstrapPayload {
        settings,
        workspaces,
        active_workspace_id,
        capabilities: None,
        session,
        collections,
        environments,
        history,
        recovery_notices,
    })
}

pub fn export_workspace_package(
    db_path: &Path,
    workspace_id: &str,
) -> Result<WorkspaceExportPackageDto, AppError> {
    let connection = open_connection(db_path)?;
    let settings = load_settings_with_connection(&connection)?.unwrap_or_default();
    let data = build_workspace_export_data_with_connection(&connection, workspace_id)?;

    Ok(build_workspace_export_package(&settings, data))
}

pub fn export_application_package(db_path: &Path) -> Result<ApplicationExportPackageDto, AppError> {
    let connection = open_connection(db_path)?;
    let settings = load_settings_with_connection(&connection)?.unwrap_or_default();
    let active_workspace_id = load_active_workspace_id(&connection)?;
    let workspace_summaries = list_workspaces_with_connection(&connection)?;
    let mut workspaces = Vec::with_capacity(workspace_summaries.len());

    for workspace in workspace_summaries {
        workspaces.push(build_workspace_export_data_with_connection(
            &connection,
            &workspace.id,
        )?);
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
    let workspace = import_workspace_data_with_connection(&connection, &data, strategy)?
        .ok_or_else(|| {
            db_error(
                "workspace import skipped due to conflict",
                Some(package.workspace.name.clone()),
            )
        })?;

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

pub fn save_workspace_session(
    db_path: &Path,
    payload: &SaveWorkspacePayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    save_workspace_session_in_connection(&connection, &payload.workspace_id, &payload.session)
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

pub(crate) fn list_workspaces_with_connection(
    connection: &Connection,
) -> Result<Vec<WorkspaceSummaryDto>, AppError> {
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
        workspaces
            .push(row.map_err(|err| db_error("failed to map workspace", Some(err.to_string())))?);
    }
    Ok(workspaces)
}

pub(crate) fn load_workspace_summary_with_connection(
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

pub(crate) fn load_workspace_session_with_connection(
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

pub(crate) fn save_workspace_session_in_connection(
    connection: &Connection,
    workspace_id: &str,
    session: &WorkspaceSessionDto,
) -> Result<(), AppError> {
    let tabs_json = serialize_json(&session.open_tabs, "workspace tabs")?;
    connection
        .execute(
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
        )
        .map_err(|err| db_error("failed to save workspace session", Some(err.to_string())))?;
    Ok(())
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
                .map_err(|err| {
                    db_error("failed to update active workspace", Some(err.to_string()))
                })?;
        }
        None => {
            connection
                .execute(
                    "DELETE FROM app_metadata WHERE key = ?1",
                    params![ACTIVE_WORKSPACE_KEY],
                )
                .map_err(|err| {
                    db_error("failed to clear active workspace", Some(err.to_string()))
                })?;
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

    Ok(redact_workspace_export_data(WorkspaceExportDataDto {
        workspace,
        session,
        collections,
        environments,
        history,
    }))
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
        connection
            .execute(
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
        let imported_collection_id = collection_id_map.get(&collection.id).ok_or_else(|| {
            db_error(
                "missing imported collection id",
                Some(collection.id.clone()),
            )
        })?;

        for (request_index, request) in collection.requests.iter().enumerate() {
            let new_request_id = generate_id("request");
            request_id_map.insert(request.id.clone(), new_request_id.clone());
            let tags_json = serialize_json(&request.tags, "request tags")?;
            let params_json = serialize_json(&request.params, "request params")?;
            let headers_json = serialize_json(&request.headers, "request headers")?;
            let auth_json = serialize_json(&request.auth, "request auth")?;
            let tests_json = serialize_json(&request.tests, "request tests")?;
            let mock_json = serialize_json(&request.mock, "request mock")?;
            let form_data_fields_json =
                serialize_json(&request.form_data_fields, "request form data fields")?;

            let execution_options_json =
                serialize_json(&request.execution_options, "request execution options")?;

            connection
                .execute(
                    "INSERT INTO requests
                     (id, workspace_id, collection_id, name, description, tags_json, method, url, params_json, headers_json, body, body_type, body_content_type, form_data_fields_json, binary_file_name, binary_mime_type, auth_json, tests_json, mock_json, execution_options_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
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
                        request.body_content_type,
                        form_data_fields_json,
                        request.binary_file_name,
                        request.binary_mime_type,
                        auth_json,
                        tests_json,
                        mock_json,
                        execution_options_json,
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
            execution_source: history_item.execution_source.clone(),
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

fn seed_demo_workspace_with_connection(
    connection: &Connection,
) -> Result<WorkspaceSummaryDto, AppError> {
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
                request_kind: None,
                mcp: None,
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
                body_content_type: None,
                form_data_fields: Vec::new(),
                binary_file_name: None,
                binary_mime_type: None,
                auth: crate::models::AuthConfigDto::default(),
                tests: Vec::new(),
                mock: None,
                execution_options: RequestExecutionOptionsDto::default(),
            },
            RequestPresetDto {
                id: generate_id("request"),
                request_kind: None,
                mcp: None,
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
                body: "{\n  \"title\": \"hello\",\n  \"body\": \"world\",\n  \"userId\": 1\n}"
                    .to_string(),
                body_type: "json".to_string(),
                body_content_type: None,
                form_data_fields: Vec::new(),
                binary_file_name: None,
                binary_mime_type: None,
                auth: crate::models::AuthConfigDto::default(),
                tests: Vec::new(),
                mock: None,
                execution_options: RequestExecutionOptionsDto::default(),
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
        let mock_json = serialize_json(&request.mock, "request mock")?;
        let form_data_fields_json =
            serialize_json(&request.form_data_fields, "request form data fields")?;
        let execution_options_json =
            serialize_json(&request.execution_options, "request execution options")?;
        connection
            .execute(
                "INSERT INTO requests
                 (id, workspace_id, collection_id, name, description, tags_json, method, url, params_json, headers_json, body, body_type, body_content_type, form_data_fields_json, binary_file_name, binary_mime_type, auth_json, tests_json, mock_json, execution_options_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
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
                    request.body_content_type,
                    form_data_fields_json,
                    request.binary_file_name,
                    request.binary_mime_type,
                    auth_json,
                    tests_json,
                    mock_json,
                    execution_options_json,
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
            request_kind: None,
            mcp: None,
            request_id: Some(collection.requests[0].id.clone()),
            origin: Some(crate::models::RequestTabOriginDto {
                kind: "resource".to_string(),
                request_id: Some(collection.requests[0].id.clone()),
                history_item_id: None,
            }),
            persistence_state: Some("saved".to_string()),
            execution_state: Some("idle".to_string()),
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
            body_content_type: collection.requests[0].body_content_type.clone(),
            form_data_fields: collection.requests[0].form_data_fields.clone(),
            binary_file_name: collection.requests[0].binary_file_name.clone(),
            binary_mime_type: collection.requests[0].binary_mime_type.clone(),
            auth: collection.requests[0].auth.clone(),
            tests: collection.requests[0].tests.clone(),
            mock: collection.requests[0].mock.clone(),
            execution_options: collection.requests[0].execution_options.clone(),
            response: crate::models::ResponseStateDto::default(),
            is_sending: false,
            is_dirty: false,
        }],
    };
    save_workspace_session_in_connection(connection, &workspace.id, &session)?;
    Ok(workspace)
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
            let mock_json = serialize_json(&request.mock, "request mock")?;
            let form_data_fields_json =
                serialize_json(&request.form_data_fields, "request form data fields")?;
            let execution_options_json =
                serialize_json(&request.execution_options, "request execution options")?;
            connection.execute(
                "INSERT INTO requests
                 (id, workspace_id, collection_id, name, description, tags_json, method, url, params_json, headers_json, body, body_type, body_content_type, form_data_fields_json, binary_file_name, binary_mime_type, auth_json, tests_json, mock_json, execution_options_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
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
                    request.body_content_type,
                    form_data_fields_json,
                    request.binary_file_name,
                    request.binary_mime_type,
                    auth_json,
                    tests_json,
                    mock_json,
                    execution_options_json,
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
            request_kind: None,
            mcp: None,
            active_environment_id: None,
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
            mock: None,
            execution_options: RequestExecutionOptionsDto::default(),
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
            execution_source: history_item.execution_source.clone(),
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

#[cfg(test)]
mod tests {
    use super::{
        create_workspace, ensure_bootstrap_data, export_application_package,
        export_workspace_package, import_application_package, import_workspace_package,
        list_workspaces, load_workspace_session_with_connection, save_workspace_session,
    };
    use crate::models::request::{
        RequestBodyDto, RequestExecutionOptionsDto, RequestProxyModeDto,
        RequestProxySettingsDto, RequestRedirectPolicyDto,
    };
    use crate::models::{
        AppSettings, CreateWorkspacePayloadDto, HistoryStoredPayloadDto, ImportConflictStrategy,
        KeyValueItemDto, LegacyWorkspaceSnapshotDto, RequestCollectionDto, RequestPresetDto,
        SaveWorkspacePayloadDto, SendRequestPayloadDto, WorkspaceSessionDto,
    };
    use crate::storage::connection::open_connection;
    use crate::storage::db::initialize_database;
    use crate::storage::repositories::collection_repo::load_collections_with_connection;
    use crate::storage::repositories::environment_repo::load_environments_with_connection;
    use crate::storage::repositories::history_repo::{
        insert_history_item, load_history_export_with_connection,
    };
    use crate::storage::repositories::request_repo::save_request;
    use crate::storage::repositories::settings_repo::save_settings;
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
    fn bootstrap_migrates_legacy_snapshot_instead_of_demo_seed() {
        let db_path = temp_db_path("legacy-bootstrap");
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
                    request_kind: None,
                    mcp: None,
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
                    body_content_type: None,
                    form_data_fields: Vec::new(),
                    binary_file_name: None,
                    binary_mime_type: None,
                    auth: Default::default(),
                    tests: Vec::new(),
                    mock: None,
                    execution_options: RequestExecutionOptionsDto::default(),
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
    fn workspace_session_repo_roundtrips_draft_origin_and_body_metadata() {
        let db_path = temp_db_path("workspace-session-roundtrip");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");

        save_workspace_session(
            &db_path,
            &SaveWorkspacePayloadDto {
                workspace_id: workspace_id.clone(),
                session: WorkspaceSessionDto {
                    active_tab_id: Some("tab-formdata".to_string()),
                    active_environment_id: bootstrap
                        .environments
                        .first()
                        .map(|environment| environment.id.clone()),
                    open_tabs: vec![crate::models::RequestTabStateDto {
                        id: "tab-formdata".to_string(),
                        request_kind: None,
                        mcp: None,
                        request_id: None,
                        origin: Some(crate::models::RequestTabOriginDto {
                            kind: "scratch".to_string(),
                            request_id: None,
                            history_item_id: None,
                        }),
                        persistence_state: Some("unsaved".to_string()),
                        execution_state: Some("idle".to_string()),
                        name: "Multipart Upload".to_string(),
                        description: String::new(),
                        tags: Vec::new(),
                        collection_name: "Scratch Pad".to_string(),
                        collection_id: None,
                        method: "POST".to_string(),
                        url: "https://example.com/upload".to_string(),
                        params: Vec::new(),
                        headers: Vec::new(),
                        body: String::new(),
                        body_type: "formdata".to_string(),
                        body_content_type: None,
                        form_data_fields: vec![crate::models::request::FormDataFieldDto {
                            key: "file".to_string(),
                            value: "payload".to_string(),
                            enabled: true,
                            kind: Some("file".to_string()),
                            file_name: Some("demo.txt".to_string()),
                            mime_type: Some("text/plain".to_string()),
                        }],
                        binary_file_name: None,
                        binary_mime_type: None,
                        auth: Default::default(),
                        tests: Vec::new(),
                        mock: None,
                        execution_options: RequestExecutionOptionsDto {
                            timeout_ms: Some(5_000),
                            redirect_policy: RequestRedirectPolicyDto::Manual,
                            proxy: RequestProxySettingsDto {
                                mode: RequestProxyModeDto::Custom,
                                url: Some("http://127.0.0.1:8080".to_string()),
                            },
                            verify_ssl: false,
                        },
                        response: crate::models::ResponseStateDto::default(),
                        is_sending: false,
                        is_dirty: true,
                    }],
                },
            },
        )
        .expect("session saved");

        let connection = open_connection(&db_path).expect("connection opened");
        let session = load_workspace_session_with_connection(&connection, &workspace_id)
            .expect("session query")
            .expect("session exists");
        let tab = &session.open_tabs[0];

        assert_eq!(
            tab.origin.as_ref().map(|origin| origin.kind.as_str()),
            Some("scratch")
        );
        assert_eq!(tab.persistence_state.as_deref(), Some("unsaved"));
        assert_eq!(tab.execution_state.as_deref(), Some("idle"));
        assert_eq!(tab.body_type, "formdata");
        assert_eq!(tab.form_data_fields.len(), 1);
        assert_eq!(
            tab.form_data_fields[0].file_name.as_deref(),
            Some("demo.txt")
        );
        assert_eq!(tab.execution_options.timeout_ms, Some(5_000));
        assert_eq!(
            tab.execution_options.redirect_policy,
            RequestRedirectPolicyDto::Manual
        );
        assert_eq!(tab.execution_options.proxy.mode, RequestProxyModeDto::Custom);
        assert_eq!(
            tab.execution_options.proxy.url.as_deref(),
            Some("http://127.0.0.1:8080")
        );
        assert!(!tab.execution_options.verify_ssl);

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn bootstrap_ignores_corrupted_workspace_session_and_reports_recovery_notice() {
        let db_path = temp_db_path("workspace-session-corrupted");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");

        let connection = open_connection(&db_path).expect("connection opened");
        connection
            .execute(
                "UPDATE workspace_sessions SET tabs_json = ?1 WHERE workspace_id = ?2",
                rusqlite::params!["{bad-json", workspace_id],
            )
            .expect("session corrupted");

        let payload = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");

        assert!(payload.session.is_none());
        assert!(payload
            .recovery_notices
            .iter()
            .any(|notice| notice.diagnostic_key.as_deref() == Some("workspace_session_corrupted")));

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn bootstrap_redacts_session_collection_environment_and_history_secrets() {
        let db_path = temp_db_path("bootstrap-redaction");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");
        let collection_id = bootstrap.collections[0].id.clone();
        let request = bootstrap.collections[0].requests[0].clone();
        let environment_id = bootstrap.environments[0].id.clone();

        let mut secret_request = request.clone();
        secret_request.auth.r#type = "bearer".to_string();
        secret_request.auth.bearer_token = "secret-token".to_string();
        secret_request.headers.push(KeyValueItemDto {
            key: "Cookie".to_string(),
            value: "session=secret-cookie".to_string(),
            description: String::new(),
            enabled: true,
        });

        let saved_request = save_request(
            &db_path,
            &crate::models::SaveRequestPayloadDto {
                workspace_id: workspace_id.clone(),
                collection_id,
                request: secret_request.clone(),
            },
        )
        .expect("request saved");

        save_workspace_session(
            &db_path,
            &SaveWorkspacePayloadDto {
                workspace_id: workspace_id.clone(),
                session: WorkspaceSessionDto {
                    active_tab_id: Some("tab-secret".to_string()),
                    active_environment_id: Some(environment_id),
                    open_tabs: vec![crate::models::RequestTabStateDto {
                        id: "tab-secret".to_string(),
                        request_kind: None,
                        mcp: None,
                        request_id: Some(saved_request.id.clone()),
                        origin: None,
                        persistence_state: Some("saved".to_string()),
                        execution_state: Some("idle".to_string()),
                        name: saved_request.name.clone(),
                        description: saved_request.description.clone(),
                        tags: saved_request.tags.clone(),
                        collection_name: saved_request.collection_name.clone().unwrap_or_default(),
                        collection_id: saved_request.collection_id.clone(),
                        method: saved_request.method.clone(),
                        url: saved_request.url.clone(),
                        params: saved_request.params.clone(),
                        headers: secret_request.headers.clone(),
                        body: saved_request.body.clone(),
                        body_type: saved_request.body_type.clone(),
                        body_content_type: saved_request.body_content_type.clone(),
                        form_data_fields: saved_request.form_data_fields.clone(),
                        binary_file_name: saved_request.binary_file_name.clone(),
                        binary_mime_type: saved_request.binary_mime_type.clone(),
                        auth: secret_request.auth.clone(),
                        tests: saved_request.tests.clone(),
                        mock: saved_request.mock.clone(),
                        execution_options: saved_request.execution_options.clone(),
                        response: crate::models::ResponseStateDto::default(),
                        is_sending: false,
                        is_dirty: false,
                    }],
                },
            },
        )
        .expect("session saved");

        insert_history_item(
            &db_path,
            &workspace_id,
            &HistoryStoredPayloadDto {
                request_id: Some(saved_request.id.clone()),
                request_name: saved_request.name.clone(),
                request_method: saved_request.method.clone(),
                request_url: saved_request.url.clone(),
                request_snapshot: SendRequestPayloadDto {
                    workspace_id: workspace_id.clone(),
                    request_kind: None,
                    mcp: None,
                    active_environment_id: None,
                    tab_id: "tab-secret".to_string(),
                    request_id: Some(saved_request.id.clone()),
                    name: saved_request.name.clone(),
                    description: saved_request.description.clone(),
                    tags: saved_request.tags.clone(),
                    collection_name: saved_request.collection_name.clone().unwrap_or_default(),
                    method: saved_request.method.clone(),
                    url: saved_request.url.clone(),
                    params: saved_request.params.clone(),
                    headers: secret_request.headers.clone(),
                    body: RequestBodyDto::Raw {
                        value: String::new(),
                        content_type: None,
                    },
                    auth: secret_request.auth.clone(),
                    tests: saved_request.tests.clone(),
                    mock: None,
                    execution_options: saved_request.execution_options.clone(),
                },
                status: 200,
                status_text: "OK".to_string(),
                elapsed_ms: 12,
                size_bytes: 128,
                content_type: "application/json".to_string(),
                response_headers: Vec::new(),
                response_preview: "{\"ok\":true}".to_string(),
                truncated: false,
                execution_source: "live".to_string(),
                executed_at_epoch_ms: 1_717_171_717_000,
            },
        )
        .expect("history inserted");

        let refreshed = ensure_bootstrap_data(&db_path, None).expect("bootstrap refreshed");
        let session_tab = &refreshed.session.expect("session").open_tabs[0];
        let collection_request = refreshed
            .collections
            .iter()
            .flat_map(|collection| collection.requests.iter())
            .find(|item| item.id == saved_request.id)
            .expect("saved request present");
        let environment = &refreshed.environments[0];
        let history = refreshed
            .history
            .iter()
            .find(|item| item.request_id.as_deref() == Some(saved_request.id.as_str()))
            .expect("history item present");
        let history_snapshot = history
            .request_snapshot
            .as_ref()
            .expect("history snapshot present");

        assert_eq!(session_tab.auth.bearer_token, "[REDACTED]");
        assert!(session_tab
            .headers
            .iter()
            .all(|header| header.key != "Cookie" || header.value == "[REDACTED]"));
        assert_eq!(collection_request.auth.bearer_token, "[REDACTED]");
        assert!(collection_request
            .headers
            .iter()
            .all(|header| header.key != "Cookie" || header.value == "[REDACTED]"));
        assert!(environment
            .variables
            .iter()
            .any(|item| item.key == "token" && item.value == "[REDACTED]"));
        assert_eq!(history_snapshot.auth.bearer_token, "[REDACTED]");
        assert!(history_snapshot
            .headers
            .iter()
            .all(|header| header.key != "Cookie" || header.value == "[REDACTED]"));
        let explainability = history
            .explainability
            .as_ref()
            .expect("history explainability present");
        assert!(explainability
            .sources
            .iter()
            .any(|source| source.category == "safe-projected"));
        assert!(explainability
            .limitations
            .iter()
            .any(|limitation| limitation.code == "safe_projection_loss"));

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn workspace_export_redacts_request_auth_and_environment_secrets() {
        let db_path = temp_db_path("workspace-redaction");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");
        let collection_id = bootstrap.collections[0].id.clone();

        let mut secret_request = bootstrap.collections[0].requests[0].clone();
        secret_request.id = String::new();
        secret_request.name = "Secret Request".to_string();
        secret_request.auth.r#type = "bearer".to_string();
        secret_request.auth.bearer_token = "secret-token".to_string();
        secret_request.headers.push(KeyValueItemDto {
            key: "Cookie".to_string(),
            value: "session=secret-cookie".to_string(),
            description: String::new(),
            enabled: true,
        });

        let saved_request = save_request(
            &db_path,
            &crate::models::SaveRequestPayloadDto {
                workspace_id: workspace_id.clone(),
                collection_id,
                request: secret_request,
            },
        )
        .expect("request saved");

        let export = export_workspace_package(&db_path, &workspace_id).expect("workspace exported");
        let request = export
            .collections
            .iter()
            .flat_map(|collection| collection.requests.iter())
            .find(|request| request.id == saved_request.id)
            .expect("saved request present in export");
        let environment = &export.environments[0];

        assert_eq!(request.auth.bearer_token, "[REDACTED]");
        assert!(request
            .headers
            .iter()
            .all(|header| header.key != "Cookie" || header.value == "[REDACTED]"));
        assert!(environment
            .variables
            .iter()
            .any(|item| item.key == "token" && item.value == "[REDACTED]"));

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn export_import_roundtrip_preserves_workspace_shape() {
        let db_path = temp_db_path("workspace-roundtrip");
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
                        request_kind: None,
                        mcp: None,
                        request_id: Some(request.id.clone()),
                        origin: Some(crate::models::RequestTabOriginDto {
                            kind: "resource".to_string(),
                            request_id: Some(request.id.clone()),
                            history_item_id: None,
                        }),
                        persistence_state: Some("saved".to_string()),
                        execution_state: Some("idle".to_string()),
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
                        body_content_type: request.body_content_type.clone(),
                        form_data_fields: request.form_data_fields.clone(),
                        binary_file_name: request.binary_file_name.clone(),
                        binary_mime_type: request.binary_mime_type.clone(),
                        auth: request.auth.clone(),
                        tests: request.tests.clone(),
                        mock: request.mock.clone(),
                        execution_options: RequestExecutionOptionsDto {
                            timeout_ms: Some(5_000),
                            redirect_policy: RequestRedirectPolicyDto::Manual,
                            proxy: RequestProxySettingsDto {
                                mode: RequestProxyModeDto::Custom,
                                url: Some("http://127.0.0.1:8080".to_string()),
                            },
                            verify_ssl: false,
                        },
                        response: crate::models::ResponseStateDto::default(),
                        is_sending: false,
                        is_dirty: false,
                    }],
                },
            },
        )
        .expect("session saved");

        insert_history_item(
            &db_path,
            &workspace_id,
            &HistoryStoredPayloadDto {
                request_id: Some(request.id.clone()),
                request_name: request.name.clone(),
                request_method: request.method.clone(),
                request_url: request.url.clone(),
                request_snapshot: SendRequestPayloadDto {
                    workspace_id: workspace_id.clone(),
                    request_kind: None,
                    mcp: None,
                    active_environment_id: None,
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
                    mock: None,
                    execution_options: RequestExecutionOptionsDto {
                        timeout_ms: Some(5_000),
                        redirect_policy: RequestRedirectPolicyDto::Manual,
                        proxy: RequestProxySettingsDto {
                            mode: RequestProxyModeDto::Custom,
                            url: Some("http://127.0.0.1:8080".to_string()),
                        },
                        verify_ssl: false,
                    },
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
                execution_source: "live".to_string(),
                executed_at_epoch_ms: 1_717_171_717_000,
            },
        )
        .expect("history inserted");

        let export = export_workspace_package(&db_path, &workspace_id).expect("workspace exported");
        let imported = import_workspace_package(&db_path, &export, ImportConflictStrategy::Rename)
            .expect("workspace imported");

        assert_eq!(export.format_version, 1);
        assert_eq!(
            imported.scope,
            crate::models::ExportPackageScopeDto::Workspace
        );
        assert_eq!(imported.workspace.name, "Demo Workspace (Imported)");

        let workspaces = list_workspaces(&db_path).expect("workspaces listed");
        assert_eq!(workspaces.len(), 2);

        let connection = open_connection(&db_path).expect("connection opened");
        let imported_collections =
            load_collections_with_connection(&connection, &imported.workspace.id)
                .expect("collections loaded");
        let imported_environments =
            load_environments_with_connection(&connection, &imported.workspace.id)
                .expect("environments loaded");
        let imported_history =
            load_history_export_with_connection(&connection, &imported.workspace.id)
                .expect("history loaded");
        let imported_session =
            load_workspace_session_with_connection(&connection, &imported.workspace.id)
                .expect("session query")
                .expect("session exists");

        assert_eq!(imported_collections.len(), export.collections.len());
        assert_eq!(imported_environments.len(), export.environments.len());
        assert_eq!(imported_history.len(), export.history.len());
        assert_eq!(imported_history[0].response_preview, "{\"ok\":true}");

        let imported_request_id = imported_collections[0].requests[0].id.clone();
        let imported_environment_id = imported_environments[0].id.clone();
        assert_eq!(
            imported_session.active_environment_id,
            Some(imported_environment_id)
        );
        assert_eq!(
            imported_session.open_tabs[0].request_id,
            Some(imported_request_id.clone())
        );
        assert_eq!(
            imported_session.open_tabs[0].execution_options.timeout_ms,
            Some(5_000)
        );
        assert_eq!(
            imported_session.open_tabs[0].execution_options.redirect_policy,
            RequestRedirectPolicyDto::Manual
        );
        assert_eq!(
            imported_session.open_tabs[0].execution_options.proxy.mode,
            RequestProxyModeDto::Custom
        );
        assert_eq!(
            imported_session.open_tabs[0]
                .execution_options
                .proxy
                .url
                .as_deref(),
            Some("http://127.0.0.1:8080")
        );
        assert!(!imported_session.open_tabs[0].execution_options.verify_ssl);
        assert_eq!(imported_history[0].request_id, Some(imported_request_id));
        assert_eq!(
            imported_history[0].request_snapshot.execution_options.timeout_ms,
            Some(5_000)
        );
        assert_eq!(
            imported_history[0].request_snapshot.execution_options.redirect_policy,
            RequestRedirectPolicyDto::Manual
        );
        assert_eq!(
            imported_history[0].request_snapshot.execution_options.proxy.mode,
            RequestProxyModeDto::Custom
        );
        assert_eq!(
            imported_history[0]
                .request_snapshot
                .execution_options
                .proxy
                .url
                .as_deref(),
            Some("http://127.0.0.1:8080")
        );
        assert!(!imported_history[0].request_snapshot.execution_options.verify_ssl);

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn application_export_import_roundtrip_restores_settings_and_active_workspace() {
        let db_path = temp_db_path("application-roundtrip");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap.active_workspace_id.expect("active workspace id");

        create_workspace(
            &db_path,
            &CreateWorkspacePayloadDto {
                name: "Second Workspace".to_string(),
            },
        )
        .expect("second workspace created");

        save_settings(
            &db_path,
            &AppSettings {
                theme_mode: "light".to_string(),
                locale: "zh-CN".to_string(),
            },
        )
        .expect("settings saved");

        let export = export_application_package(&db_path).expect("application exported");
        assert_eq!(
            export.scope,
            crate::models::ExportPackageScopeDto::Application
        );
        assert_eq!(export.workspaces.len(), 2);
        assert_eq!(export.active_workspace_id, Some(workspace_id));

        let imported =
            import_application_package(&db_path, &export, ImportConflictStrategy::Rename)
                .expect("application imported");

        assert_eq!(
            imported.scope,
            crate::models::ExportPackageScopeDto::Application
        );
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
