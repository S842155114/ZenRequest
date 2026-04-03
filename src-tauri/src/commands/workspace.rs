use std::fs;
use std::path::PathBuf;

use tauri::State;

use crate::core::app_state::AppState;
use crate::services::workspace_service;
use crate::core::runtime_capabilities::{
    builtin_plugin_manifest_descriptors, builtin_tool_packaging_descriptors,
};
use crate::errors::AppError;
use crate::models::{
    ApiEnvelope, AppBootstrapPayload, CommandAck, CreateWorkspacePayloadDto,
    DeleteWorkspacePayloadDto, ImportWorkspacePayloadDto, LegacyWorkspaceSnapshotDto,
    RuntimeCapabilitiesDto, RuntimeCapabilityDescriptorDto, RuntimeExecutionHookCapabilityDto,
    RuntimeImportAdapterCapabilityDto, RuntimePluginManifestCapabilityDto,
    RuntimeProtocolCapabilityDto, RuntimeToolPackagingCapabilityDto, SaveWorkspacePayloadDto,
    SaveTextFilePayloadDto, SaveTextFileResultDto, SetActiveWorkspacePayloadDto,
    WorkspaceExportPayloadDto, WorkspaceExportResultDto, WorkspaceImportResultDto,
    WorkspaceSaveResult, WorkspaceSummaryDto,
};

fn build_runtime_capabilities(state: &AppState) -> RuntimeCapabilitiesDto {
    RuntimeCapabilitiesDto {
        descriptors: state
            .capability_registry
            .descriptors()
            .iter()
            .map(|descriptor| RuntimeCapabilityDescriptorDto {
                key: descriptor.key.clone(),
                kind: descriptor.kind.clone(),
                display_name: descriptor.display_name.clone(),
                availability: descriptor.availability.clone(),
            })
            .collect(),
        protocols: state
            .protocol_registry
            .descriptors()
            .iter()
            .map(|descriptor| RuntimeProtocolCapabilityDto {
                key: descriptor.key.clone(),
                display_name: descriptor.display_name.clone(),
                schemes: descriptor.schemes.clone(),
                availability: descriptor.availability.clone(),
            })
            .collect(),
        import_adapters: state
            .import_registry
            .descriptors()
            .iter()
            .map(|descriptor| RuntimeImportAdapterCapabilityDto {
                key: descriptor.key.clone(),
                display_name: descriptor.display_name.clone(),
                availability: descriptor.availability.clone(),
            })
            .collect(),
        execution_hooks: state
            .hook_registry
            .descriptors()
            .iter()
            .map(|descriptor| RuntimeExecutionHookCapabilityDto {
                key: descriptor.key.clone(),
                display_name: descriptor.display_name.clone(),
                availability: descriptor.availability.clone(),
            })
            .collect(),
        tool_packaging: builtin_tool_packaging_descriptors()
            .into_iter()
            .map(|descriptor| RuntimeToolPackagingCapabilityDto {
                key: descriptor.key,
                display_name: descriptor.display_name,
                availability: descriptor.availability,
            })
            .collect(),
        plugin_manifests: builtin_plugin_manifest_descriptors()
            .into_iter()
            .map(|descriptor| RuntimePluginManifestCapabilityDto {
                key: descriptor.key,
                display_name: descriptor.display_name,
                availability: descriptor.availability,
            })
            .collect(),
    }
}

#[tauri::command]
pub fn bootstrap_app(
    state: State<'_, AppState>,
    legacy_snapshot: Option<LegacyWorkspaceSnapshotDto>,
) -> Result<ApiEnvelope<AppBootstrapPayload>, AppError> {
    let mut payload = workspace_service::bootstrap(&state, legacy_snapshot)?;
    payload.capabilities = Some(build_runtime_capabilities(&state));

    Ok(ApiEnvelope::success(payload))
}

#[tauri::command]
pub fn save_workspace(
    state: State<'_, AppState>,
    payload: SaveWorkspacePayloadDto,
) -> ApiEnvelope<WorkspaceSaveResult> {
    match workspace_service::save_workspace(&state, payload) {
        Ok(result) => ApiEnvelope::success(result),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn list_workspaces(
    state: State<'_, AppState>,
) -> Result<ApiEnvelope<Vec<WorkspaceSummaryDto>>, AppError> {
    let workspaces = workspace_service::list_workspaces(&state)?;
    Ok(ApiEnvelope::success(workspaces))
}

#[tauri::command]
pub fn create_workspace(
    state: State<'_, AppState>,
    payload: CreateWorkspacePayloadDto,
) -> Result<ApiEnvelope<WorkspaceSummaryDto>, AppError> {
    let workspace = workspace_service::create_workspace(&state, payload)?;
    Ok(ApiEnvelope::success(workspace))
}

#[tauri::command]
pub fn delete_workspace(
    state: State<'_, AppState>,
    payload: DeleteWorkspacePayloadDto,
) -> ApiEnvelope<CommandAck> {
    if let Err(error) = workspace_service::delete_workspace(&state, payload) {
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
    if let Err(error) = workspace_service::set_active_workspace(&state, payload) {
        return ApiEnvelope::failure(error);
    }

    ApiEnvelope::success(CommandAck {
        message: "active workspace updated".to_string(),
    })
}

#[tauri::command]
pub fn export_workspace(
    state: State<'_, AppState>,
    payload: WorkspaceExportPayloadDto,
) -> Result<ApiEnvelope<WorkspaceExportResultDto>, AppError> {
    let result = workspace_service::export_workspace(&state, payload.workspace_id, payload.scope)?;
    Ok(ApiEnvelope::success(result))
}

#[tauri::command]
pub fn import_workspace(
    state: State<'_, AppState>,
    payload: ImportWorkspacePayloadDto,
) -> Result<ApiEnvelope<WorkspaceImportResultDto>, AppError> {
    let result = workspace_service::import_workspace(&state, payload)?;
    Ok(ApiEnvelope::success(result))
}


#[tauri::command]
pub fn save_text_file(
    payload: SaveTextFilePayloadDto,
) -> ApiEnvelope<SaveTextFileResultDto> {
    let trimmed_name = payload.file_name.trim();
    if trimmed_name.is_empty() {
        return ApiEnvelope::failure(AppError {
            code: "INVALID_INPUT".to_string(),
            message: "file name is required".to_string(),
            details: None,
        });
    }

    let target_path = payload
        .target_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            let mut default_path = dirs::download_dir().unwrap_or_else(std::env::temp_dir);
            default_path.push(trimmed_name);
            default_path
        });

    let result = if payload.target_path.as_deref().map(str::trim).filter(|value| !value.is_empty()).is_some() {
        write_text_file(&target_path, &payload.contents)
    } else {
        write_unique_text_file(&target_path, &payload.contents)
    };
    match result {
        Ok(path) => ApiEnvelope::success(SaveTextFileResultDto {
            path: path.to_string_lossy().to_string(),
        }),
        Err(error) => ApiEnvelope::failure(AppError {
            code: "FILE_SAVE_FAILED".to_string(),
            message: "failed to save file".to_string(),
            details: Some(error.to_string()),
        }),
    }
}

fn write_text_file(target_path: &PathBuf, contents: &str) -> std::io::Result<PathBuf> {
    let parent = target_path.parent().map(PathBuf::from).unwrap_or_else(std::env::temp_dir);
    fs::create_dir_all(&parent)?;
    fs::write(target_path, contents)?;
    Ok(target_path.clone())
}

fn write_unique_text_file(target_path: &PathBuf, contents: &str) -> std::io::Result<PathBuf> {
    let parent = target_path.parent().map(PathBuf::from).unwrap_or_else(std::env::temp_dir);
    fs::create_dir_all(&parent)?;

    let stem = target_path.file_stem().and_then(|value| value.to_str()).unwrap_or("download");
    let extension = target_path.extension().and_then(|value| value.to_str()).unwrap_or("");

    for index in 0..1000 {
        let mut candidate = parent.clone();
        let file_name = if index == 0 {
            if extension.is_empty() {
                stem.to_string()
            } else {
                format!("{stem}.{extension}")
            }
        } else if extension.is_empty() {
            format!("{stem}-{index}")
        } else {
            format!("{stem}-{index}.{extension}")
        };

        candidate.push(file_name);

        if !candidate.exists() {
            fs::write(&candidate, contents)?;
            return Ok(candidate);
        }
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::AlreadyExists,
        "unable to allocate a unique output file name",
    ))
}
