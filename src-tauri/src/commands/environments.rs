use tauri::State;

use crate::core::app_state::AppState;
use crate::models::{
    ApiEnvelope, CommandAck, CreateEnvironmentPayloadDto, DeleteEnvironmentPayloadDto,
    EnvironmentDto, RenameEnvironmentPayloadDto, UpdateEnvironmentVariablesPayloadDto,
};
use crate::services::environment_service;

#[tauri::command]
pub fn list_environments(
    state: State<'_, AppState>,
    workspace_id: String,
) -> ApiEnvelope<Vec<EnvironmentDto>> {
    match environment_service::list_environments(&state, &workspace_id) {
        Ok(environments) => ApiEnvelope::success(environments),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn create_environment(
    state: State<'_, AppState>,
    payload: CreateEnvironmentPayloadDto,
) -> ApiEnvelope<EnvironmentDto> {
    match environment_service::create_environment(&state, &payload) {
        Ok(environment) => ApiEnvelope::success(environment),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn rename_environment(
    state: State<'_, AppState>,
    payload: RenameEnvironmentPayloadDto,
) -> ApiEnvelope<EnvironmentDto> {
    match environment_service::rename_environment(&state, &payload) {
        Ok(environment) => ApiEnvelope::success(environment),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn delete_environment(
    state: State<'_, AppState>,
    payload: DeleteEnvironmentPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match environment_service::delete_environment(&state, &payload) {
        Ok(()) => ApiEnvelope::success(CommandAck {
            message: "environment deleted".to_string(),
        }),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn update_environment_variables(
    state: State<'_, AppState>,
    payload: UpdateEnvironmentVariablesPayloadDto,
) -> ApiEnvelope<EnvironmentDto> {
    match environment_service::update_environment_variables(&state, &payload) {
        Ok(environment) => ApiEnvelope::success(environment),
        Err(error) => ApiEnvelope::failure(error),
    }
}
