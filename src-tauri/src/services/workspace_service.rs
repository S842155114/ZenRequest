use std::time::{SystemTime, UNIX_EPOCH};

use crate::core::app_state::AppState;
use crate::errors::AppError;
use crate::models::{
    AppBootstrapPayload, ApplicationExportPackageDto, CreateWorkspacePayloadDto,
    DeleteWorkspacePayloadDto, ExportPackageScopeDto, ImportExportPackageDto,
    ImportWorkspacePayloadDto, LegacyWorkspaceSnapshotDto, SaveWorkspacePayloadDto,
    SetActiveWorkspacePayloadDto, WorkspaceExportPackageDto, WorkspaceExportResultDto,
    WorkspaceImportResultDto, WorkspaceSaveResult, WorkspaceSummaryDto,
};
use crate::services::bootstrap_service;
use crate::storage::db;

fn now_epoch_ms() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
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

pub fn bootstrap(
    state: &AppState,
    legacy_snapshot: Option<LegacyWorkspaceSnapshotDto>,
) -> Result<AppBootstrapPayload, AppError> {
    bootstrap_service::bootstrap_app(state, legacy_snapshot)
}

pub fn save_workspace(
    state: &AppState,
    payload: SaveWorkspacePayloadDto,
) -> Result<WorkspaceSaveResult, AppError> {
    let saved_at_epoch_ms = now_epoch_ms();
    db::save_workspace_session(&state.db_path, &payload)?;
    Ok(WorkspaceSaveResult { saved_at_epoch_ms })
}

pub fn list_workspaces(state: &AppState) -> Result<Vec<WorkspaceSummaryDto>, AppError> {
    db::list_workspaces(&state.db_path)
}

pub fn create_workspace(
    state: &AppState,
    payload: CreateWorkspacePayloadDto,
) -> Result<WorkspaceSummaryDto, AppError> {
    db::create_workspace(&state.db_path, &payload)
}

pub fn delete_workspace(
    state: &AppState,
    payload: DeleteWorkspacePayloadDto,
) -> Result<(), AppError> {
    db::delete_workspace(&state.db_path, &payload)
}

pub fn set_active_workspace(
    state: &AppState,
    payload: SetActiveWorkspacePayloadDto,
) -> Result<(), AppError> {
    db::set_active_workspace(&state.db_path, &payload)
}

pub fn export_workspace(
    state: &AppState,
    workspace_id: Option<String>,
    scope: ExportPackageScopeDto,
) -> Result<WorkspaceExportResultDto, AppError> {
    match scope {
        ExportPackageScopeDto::Workspace => {
            let workspace_id = workspace_id.ok_or_else(|| AppError {
                code: "INVALID_EXPORT_SCOPE".to_string(),
                message: "workspace export requires workspace id".to_string(),
                details: None,
            })?;
            let package = db::export_workspace_package(&state.db_path, &workspace_id)?;
            let file_name = format!(
                "zenrequest-{}.json",
                slugify_workspace_name(&package.workspace.name)
            );
            let package_json = serde_json::to_string_pretty::<WorkspaceExportPackageDto>(&package)
                .map_err(|err| AppError {
                    code: "EXPORT_SERIALIZE_ERROR".to_string(),
                    message: "failed to serialize workspace export".to_string(),
                    details: Some(err.to_string()),
                })?;

            Ok(WorkspaceExportResultDto {
                file_name,
                package_json,
                scope: ExportPackageScopeDto::Workspace,
            })
        }
        ExportPackageScopeDto::Application => {
            let package = db::export_application_package(&state.db_path)?;
            let package_json =
                serde_json::to_string_pretty::<ApplicationExportPackageDto>(&package).map_err(
                    |err| AppError {
                        code: "EXPORT_SERIALIZE_ERROR".to_string(),
                        message: "failed to serialize application export".to_string(),
                        details: Some(err.to_string()),
                    },
                )?;

            Ok(WorkspaceExportResultDto {
                file_name: "zenrequest-backup.json".to_string(),
                package_json,
                scope: ExportPackageScopeDto::Application,
            })
        }
    }
}

pub fn import_workspace(
    state: &AppState,
    payload: ImportWorkspacePayloadDto,
) -> Result<WorkspaceImportResultDto, AppError> {
    let strategy = payload.conflict_strategy.clone();
    let package = serde_json::from_str::<ImportExportPackageDto>(&payload.package_json).map_err(
        |err| AppError {
            code: "INVALID_IMPORT_PACKAGE".to_string(),
            message: "failed to parse workspace import package".to_string(),
            details: Some(err.to_string()),
        },
    )?;

    match package {
        ImportExportPackageDto::Workspace(package) => {
            if package.format_version != 1 {
                return Err(AppError {
                    code: "UNSUPPORTED_IMPORT_PACKAGE".to_string(),
                    message: format!(
                        "unsupported workspace export format: {}",
                        package.format_version
                    ),
                    details: None,
                });
            }

            db::import_workspace_package(&state.db_path, &package, strategy)
        }
        ImportExportPackageDto::Application(package) => {
            if package.format_version != 1 {
                return Err(AppError {
                    code: "UNSUPPORTED_IMPORT_PACKAGE".to_string(),
                    message: format!(
                        "unsupported application export format: {}",
                        package.format_version
                    ),
                    details: None,
                });
            }

            db::import_application_package(&state.db_path, &package, payload.conflict_strategy)
        }
    }
}
