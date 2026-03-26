use tauri::State;

use crate::core::app_state::AppState;
use crate::models::{
    ApiEnvelope, CommandAck, CreateEnvironmentPayloadDto, DeleteEnvironmentPayloadDto,
    EnvironmentDto, RenameEnvironmentPayloadDto, UpdateEnvironmentVariablesPayloadDto,
};
use crate::storage::db;

#[tauri::command]
pub fn list_environments(
    state: State<'_, AppState>,
    workspace_id: String,
) -> ApiEnvelope<Vec<EnvironmentDto>> {
    match db::list_environments(&state.db_path, &workspace_id) {
        Ok(environments) => ApiEnvelope::success(environments),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn create_environment(
    state: State<'_, AppState>,
    payload: CreateEnvironmentPayloadDto,
) -> ApiEnvelope<EnvironmentDto> {
    match db::create_environment(&state.db_path, &payload) {
        Ok(environment) => ApiEnvelope::success(environment),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn rename_environment(
    state: State<'_, AppState>,
    payload: RenameEnvironmentPayloadDto,
) -> ApiEnvelope<EnvironmentDto> {
    match db::rename_environment(&state.db_path, &payload) {
        Ok(environment) => ApiEnvelope::success(environment),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn delete_environment(
    state: State<'_, AppState>,
    payload: DeleteEnvironmentPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match db::delete_environment(&state.db_path, &payload) {
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
    match db::update_environment_variables(&state.db_path, &payload) {
        Ok(environment) => ApiEnvelope::success(environment),
        Err(error) => ApiEnvelope::failure(error),
    }
}
