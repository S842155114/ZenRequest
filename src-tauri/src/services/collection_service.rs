use crate::core::app_state::AppState;
use crate::errors::AppError;
use crate::models::{
    CollectionMutationPayloadDto, CreateCollectionPayloadDto, DeleteCollectionPayloadDto,
    DeleteRequestPayloadDto, RequestCollectionDto, RequestPresetDto, SaveRequestPayloadDto,
};
use crate::storage::db;

pub fn list_collections(
    state: &AppState,
    workspace_id: &str,
) -> Result<Vec<RequestCollectionDto>, AppError> {
    db::list_collections(&state.db_path, workspace_id)
}

pub fn create_collection(
    state: &AppState,
    payload: &CreateCollectionPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    db::create_collection(&state.db_path, payload)
}

pub fn rename_collection(
    state: &AppState,
    payload: &CollectionMutationPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    db::rename_collection(&state.db_path, payload)
}

pub fn delete_collection(
    state: &AppState,
    payload: &DeleteCollectionPayloadDto,
) -> Result<(), AppError> {
    db::delete_collection(&state.db_path, payload)
}

pub fn save_request(
    state: &AppState,
    payload: &SaveRequestPayloadDto,
) -> Result<RequestPresetDto, AppError> {
    db::save_request(&state.db_path, payload)
}

pub fn delete_request(
    state: &AppState,
    payload: &DeleteRequestPayloadDto,
) -> Result<(), AppError> {
    db::delete_request(&state.db_path, payload)
}
