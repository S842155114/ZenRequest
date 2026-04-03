use crate::core::app_state::AppState;
use crate::errors::AppError;
use crate::models::{HistoryItemDto, HistoryQueryPayloadDto, RemoveHistoryItemPayloadDto};
use crate::storage::db;

pub fn list_history(
    state: &AppState,
    workspace_id: &str,
) -> Result<Vec<HistoryItemDto>, AppError> {
    db::list_history(&state.db_path, workspace_id)
}

pub fn clear_history(
    state: &AppState,
    payload: &HistoryQueryPayloadDto,
) -> Result<(), AppError> {
    db::clear_history(&state.db_path, payload)
}

pub fn remove_history_item(
    state: &AppState,
    payload: &RemoveHistoryItemPayloadDto,
) -> Result<(), AppError> {
    db::remove_history_item(&state.db_path, payload)
}
