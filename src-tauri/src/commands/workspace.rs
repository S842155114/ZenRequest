use std::time::{SystemTime, UNIX_EPOCH};

use tauri::State;

use crate::core::app_state::AppState;
use crate::errors::AppError;
use crate::models::{
    ApiEnvelope, AppBootstrapPayload, ApplicationExportPackageDto, CommandAck,
    CreateWorkspacePayloadDto, DeleteWorkspacePayloadDto, ExportPackageScopeDto,
    ImportExportPackageDto, ImportWorkspacePayloadDto, LegacyWorkspaceSnapshotDto,
    SaveWorkspacePayloadDto, SetActiveWorkspacePayloadDto, WorkspaceExportPackageDto,
    WorkspaceExportPayloadDto, WorkspaceExportResultDto, WorkspaceImportResultDto,
    WorkspaceSaveResult, WorkspaceSummaryDto,
};
use crate::storage::db;

fn now_epoch_ms() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

#[tauri::command]
pub fn bootstrap_app(
    state: State<'_, AppState>,
    legacy_snapshot: Option<LegacyWorkspaceSnapshotDto>,
) -> Result<ApiEnvelope<AppBootstrapPayload>, AppError> {
    let payload = db::ensure_bootstrap_data(&state.db_path, legacy_snapshot)?;

    if let Ok(mut guard) = state.settings_cache.write() {
        *guard = Some(payload.settings.clone());
    }

    Ok(ApiEnvelope::success(payload))
}

#[tauri::command]
pub fn save_workspace(
    state: State<'_, AppState>,
    payload: SaveWorkspacePayloadDto,
) -> ApiEnvelope<WorkspaceSaveResult> {
    let saved_at_epoch_ms = now_epoch_ms();
    if let Err(error) = db::save_workspace_session(&state.db_path, &payload) {
        return ApiEnvelope::failure(error);
    }

    ApiEnvelope::success(WorkspaceSaveResult { saved_at_epoch_ms })
}

#[tauri::command]
pub fn list_workspaces(state: State<'_, AppState>) -> Result<ApiEnvelope<Vec<WorkspaceSummaryDto>>, AppError> {
    let workspaces = db::list_workspaces(&state.db_path)?;
    Ok(ApiEnvelope::success(workspaces))
}

#[tauri::command]
pub fn create_workspace(
    state: State<'_, AppState>,
    payload: CreateWorkspacePayloadDto,
) -> Result<ApiEnvelope<WorkspaceSummaryDto>, AppError> {
    let workspace = db::create_workspace(&state.db_path, &payload)?;
    Ok(ApiEnvelope::success(workspace))
}

#[tauri::command]
pub fn delete_workspace(
    state: State<'_, AppState>,
    payload: DeleteWorkspacePayloadDto,
) -> ApiEnvelope<CommandAck> {
    if let Err(error) = db::delete_workspace(&state.db_path, &payload) {
        return ApiEnvelope::failure(error);
    }

    ApiEnvelope::success(CommandAck {
        message: "workspace deleted".to_string(),
    })
}

#[tauri::command]
pub fn set_active_workspace(
    state: State<'_, AppState>,
    payload: SetActiveWorkspacePayloadDto,
) -> ApiEnvelope<CommandAck> {
    if let Err(error) = db::set_active_workspace(&state.db_path, &payload) {
        return ApiEnvelope::failure(error);
    }

    ApiEnvelope::success(CommandAck {
        message: "active workspace updated".to_string(),
    })
}

fn slugify_workspace_name(name: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;

    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            last_was_dash = false;
        } else if !last_was_dash {
            slug.push('-');
            last_was_dash = true;
        }
    }

    let slug = slug.trim_matches('-').to_string();
    if slug.is_empty() {
        "workspace".to_string()
    } else {
        slug
    }
}

#[tauri::command]
pub fn export_workspace(
    state: State<'_, AppState>,
    payload: WorkspaceExportPayloadDto,
) -> Result<ApiEnvelope<WorkspaceExportResultDto>, AppError> {
    match payload.scope {
        ExportPackageScopeDto::Workspace => {
            let workspace_id = payload.workspace_id.ok_or_else(|| AppError {
                code: "INVALID_EXPORT_SCOPE".to_string(),
                message: "workspace export requires workspace id".to_string(),
                details: None,
            })?;
            let package = db::export_workspace_package(&state.db_path, &workspace_id)?;
            let file_name = format!("zenrequest-{}.json", slugify_workspace_name(&package.workspace.name));
            let package_json =
                serde_json::to_string_pretty::<WorkspaceExportPackageDto>(&package).map_err(|err| {
                    AppError {
                        code: "EXPORT_SERIALIZE_ERROR".to_string(),
                        message: "failed to serialize workspace export".to_string(),
                        details: Some(err.to_string()),
                    }
                })?;

            Ok(ApiEnvelope::success(WorkspaceExportResultDto {
                file_name,
                package_json,
                scope: ExportPackageScopeDto::Workspace,
            }))
        }
        ExportPackageScopeDto::Application => {
            let package = db::export_application_package(&state.db_path)?;
            let package_json = serde_json::to_string_pretty::<ApplicationExportPackageDto>(&package)
                .map_err(|err| AppError {
                    code: "EXPORT_SERIALIZE_ERROR".to_string(),
                    message: "failed to serialize application export".to_string(),
                    details: Some(err.to_string()),
                })?;

            Ok(ApiEnvelope::success(WorkspaceExportResultDto {
                file_name: "zenrequest-backup.json".to_string(),
                package_json,
                scope: ExportPackageScopeDto::Application,
            }))
        }
    }
}

#[tauri::command]
pub fn import_workspace(
    state: State<'_, AppState>,
    payload: ImportWorkspacePayloadDto,
) -> Result<ApiEnvelope<WorkspaceImportResultDto>, AppError> {
    let strategy = payload.conflict_strategy.clone();
    let package =
        serde_json::from_str::<ImportExportPackageDto>(&payload.package_json).map_err(|err| {
            AppError {
                code: "INVALID_IMPORT_PACKAGE".to_string(),
                message: "failed to parse workspace import package".to_string(),
                details: Some(err.to_string()),
            }
        })?;

    let result = match package {
        ImportExportPackageDto::Workspace(package) => {
            if package.format_version != 1 {
                return Err(AppError {
                    code: "UNSUPPORTED_IMPORT_PACKAGE".to_string(),
                    message: format!("unsupported workspace export format: {}", package.format_version),
                    details: None,
                });
            }

            db::import_workspace_package(&state.db_path, &package, strategy.clone())?
        }
        ImportExportPackageDto::Application(package) => {
            if package.format_version != 1 {
                return Err(AppError {
                    code: "UNSUPPORTED_IMPORT_PACKAGE".to_string(),
                    message: format!("unsupported application export format: {}", package.format_version),
                    details: None,
                });
            }

            db::import_application_package(&state.db_path, &package, strategy)?
        }
    };

    Ok(ApiEnvelope::success(result))
}
