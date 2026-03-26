use tauri::State;

use crate::core::app_state::AppState;
use crate::models::{
    ApiEnvelope, CollectionMutationPayloadDto, CommandAck, CreateCollectionPayloadDto,
    DeleteCollectionPayloadDto, DeleteRequestPayloadDto, RequestCollectionDto, RequestPresetDto,
    SaveRequestPayloadDto,
};
use crate::storage::db;

#[tauri::command]
pub fn list_collections(
    state: State<'_, AppState>,
    workspace_id: String,
) -> ApiEnvelope<Vec<RequestCollectionDto>> {
    match db::list_collections(&state.db_path, &workspace_id) {
        Ok(collections) => ApiEnvelope::success(collections),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn create_collection(
    state: State<'_, AppState>,
    payload: CreateCollectionPayloadDto,
) -> ApiEnvelope<RequestCollectionDto> {
    match db::create_collection(&state.db_path, &payload) {
        Ok(collection) => ApiEnvelope::success(collection),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn rename_collection(
    state: State<'_, AppState>,
    payload: CollectionMutationPayloadDto,
) -> ApiEnvelope<RequestCollectionDto> {
    match db::rename_collection(&state.db_path, &payload) {
        Ok(collection) => ApiEnvelope::success(collection),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn delete_collection(
    state: State<'_, AppState>,
    payload: DeleteCollectionPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match db::delete_collection(&state.db_path, &payload) {
        Ok(()) => ApiEnvelope::success(CommandAck {
            message: "collection deleted".to_string(),
        }),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn save_request(
    state: State<'_, AppState>,
    payload: SaveRequestPayloadDto,
) -> ApiEnvelope<RequestPresetDto> {
    match db::save_request(&state.db_path, &payload) {
        Ok(request) => ApiEnvelope::success(request),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn delete_request(
    state: State<'_, AppState>,
    payload: DeleteRequestPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match db::delete_request(&state.db_path, &payload) {
        Ok(()) => ApiEnvelope::success(CommandAck {
            message: "request deleted".to_string(),
        }),
        Err(error) => ApiEnvelope::failure(error),
    }
}
