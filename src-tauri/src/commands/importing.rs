use tauri::State;

use crate::core::app_state::AppState;
use crate::models::{
    ApiEnvelope, ImportCurlPayloadDto, ImportOpenApiAnalyzePayloadDto,
    ImportOpenApiApplyPayloadDto, OpenApiImportAnalysisDto, OpenApiImportApplyResultDto,
    RequestTabStateDto,
};
use crate::services::import_service;

#[tauri::command]
pub fn import_curl_request(
    _state: State<'_, AppState>,
    payload: ImportCurlPayloadDto,
) -> ApiEnvelope<RequestTabStateDto> {
    match import_service::import_curl_request(&payload.workspace_id, &payload.command) {
        Ok(draft) => ApiEnvelope::success(draft),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn analyze_openapi_import(
    _state: State<'_, AppState>,
    payload: ImportOpenApiAnalyzePayloadDto,
) -> ApiEnvelope<OpenApiImportAnalysisDto> {
    match import_service::analyze_openapi_import(&payload.workspace_id, &payload.document) {
        Ok(analysis) => ApiEnvelope::success(analysis),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn apply_openapi_import(
    state: State<'_, AppState>,
    payload: ImportOpenApiApplyPayloadDto,
) -> ApiEnvelope<OpenApiImportApplyResultDto> {
    match import_service::apply_openapi_import(&state.db_path, &payload) {
        Ok(result) => ApiEnvelope::success(result),
        Err(error) => ApiEnvelope::failure(error),
    }
}
