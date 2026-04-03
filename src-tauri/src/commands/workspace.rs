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
    SetActiveWorkspacePayloadDto, WorkspaceExportPayloadDto,
    WorkspaceExportResultDto, WorkspaceImportResultDto, WorkspaceSaveResult, WorkspaceSummaryDto,
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
