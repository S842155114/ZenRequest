use tauri::State;

use crate::core::app_state::AppState;
use crate::models::{
    ApiEnvelope, CommandAck, HistoryItemDto, HistoryQueryPayloadDto, RemoveHistoryItemPayloadDto,
};
use crate::storage::db;

#[tauri::command]
pub fn list_history(
    state: State<'_, AppState>,
    payload: HistoryQueryPayloadDto,
) -> ApiEnvelope<Vec<HistoryItemDto>> {
    match db::list_history(&state.db_path, &payload.workspace_id) {
        Ok(history) => ApiEnvelope::success(history),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn clear_history(
    state: State<'_, AppState>,
    payload: HistoryQueryPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match db::clear_history(&state.db_path, &payload) {
        Ok(()) => ApiEnvelope::success(CommandAck {
            message: "history cleared".to_string(),
        }),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn remove_history_item(
    state: State<'_, AppState>,
    payload: RemoveHistoryItemPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match db::remove_history_item(&state.db_path, &payload) {
        Ok(()) => ApiEnvelope::success(CommandAck {
            message: "history item removed".to_string(),
        }),
        Err(error) => ApiEnvelope::failure(error),
    }
}
