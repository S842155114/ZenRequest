use tauri::State;

use crate::core::app_state::AppState;
use crate::models::{
    ApiEnvelope, CommandAck, HistoryItemDto, HistoryQueryPayloadDto, RemoveHistoryItemPayloadDto,
};
use crate::services::history_service;

#[tauri::command]
pub fn list_history(
    state: State<'_, AppState>,
    payload: HistoryQueryPayloadDto,
) -> ApiEnvelope<Vec<HistoryItemDto>> {
    match history_service::list_history(&state, &payload.workspace_id) {
        Ok(history) => ApiEnvelope::success(history),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn clear_history(
    state: State<'_, AppState>,
    payload: HistoryQueryPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match history_service::clear_history(&state, &payload) {
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
    match history_service::remove_history_item(&state, &payload) {
        Ok(()) => ApiEnvelope::success(CommandAck {
            message: "history item removed".to_string(),
        }),
        Err(error) => ApiEnvelope::failure(error),
    }
}
