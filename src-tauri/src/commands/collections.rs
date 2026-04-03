use tauri::State;

use crate::core::app_state::AppState;
use crate::models::{
    ApiEnvelope, CollectionMutationPayloadDto, CommandAck, CreateCollectionPayloadDto,
    DeleteCollectionPayloadDto, DeleteRequestPayloadDto, RequestCollectionDto, RequestPresetDto,
    SaveRequestPayloadDto,
};
use crate::services::collection_service;

#[tauri::command]
pub fn list_collections(
    state: State<'_, AppState>,
    workspace_id: String,
) -> ApiEnvelope<Vec<RequestCollectionDto>> {
    match collection_service::list_collections(&state, &workspace_id) {
        Ok(collections) => ApiEnvelope::success(collections),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn create_collection(
    state: State<'_, AppState>,
    payload: CreateCollectionPayloadDto,
) -> ApiEnvelope<RequestCollectionDto> {
    match collection_service::create_collection(&state, &payload) {
        Ok(collection) => ApiEnvelope::success(collection),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn rename_collection(
    state: State<'_, AppState>,
    payload: CollectionMutationPayloadDto,
) -> ApiEnvelope<RequestCollectionDto> {
    match collection_service::rename_collection(&state, &payload) {
        Ok(collection) => ApiEnvelope::success(collection),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn delete_collection(
    state: State<'_, AppState>,
    payload: DeleteCollectionPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match collection_service::delete_collection(&state, &payload) {
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
    match collection_service::save_request(&state, &payload) {
        Ok(request) => ApiEnvelope::success(request),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn delete_request(
    state: State<'_, AppState>,
    payload: DeleteRequestPayloadDto,
) -> ApiEnvelope<CommandAck> {
    match collection_service::delete_request(&state, &payload) {
        Ok(()) => ApiEnvelope::success(CommandAck {
            message: "request deleted".to_string(),
        }),
        Err(error) => ApiEnvelope::failure(error),
    }
}
