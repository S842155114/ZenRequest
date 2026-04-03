use crate::core::app_state::AppState;
use crate::errors::AppError;
use crate::models::{
    CreateEnvironmentPayloadDto, DeleteEnvironmentPayloadDto, EnvironmentDto,
    RenameEnvironmentPayloadDto, UpdateEnvironmentVariablesPayloadDto,
};
use crate::storage::db;

pub fn list_environments(
    state: &AppState,
    workspace_id: &str,
) -> Result<Vec<EnvironmentDto>, AppError> {
    db::list_environments(&state.db_path, workspace_id)
}

pub fn create_environment(
    state: &AppState,
    payload: &CreateEnvironmentPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    db::create_environment(&state.db_path, payload)
}

pub fn rename_environment(
    state: &AppState,
    payload: &RenameEnvironmentPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    db::rename_environment(&state.db_path, payload)
}

pub fn delete_environment(
    state: &AppState,
    payload: &DeleteEnvironmentPayloadDto,
) -> Result<(), AppError> {
    db::delete_environment(&state.db_path, payload)
}

pub fn update_environment_variables(
    state: &AppState,
    payload: &UpdateEnvironmentVariablesPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    db::update_environment_variables(&state.db_path, payload)
}
