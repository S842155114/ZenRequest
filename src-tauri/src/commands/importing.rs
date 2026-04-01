use tauri::State;

use crate::core::app_state::AppState;
use crate::core::import_runtime::{
    analyze_openapi_document, apply_openapi_import as apply_openapi_import_to_workspace,
    import_curl_to_draft,
};
use crate::models::{
    ApiEnvelope, ImportCurlPayloadDto, ImportOpenApiAnalyzePayloadDto,
    ImportOpenApiApplyPayloadDto, OpenApiImportAnalysisDto,
    OpenApiImportApplyResultDto, RequestTabStateDto,
};

#[tauri::command]
pub fn import_curl_request(
    _state: State<'_, AppState>,
    payload: ImportCurlPayloadDto,
) -> ApiEnvelope<RequestTabStateDto> {
    if payload.workspace_id.trim().is_empty() {
        return ApiEnvelope::failure(crate::errors::AppError {
            code: "INVALID_WORKSPACE".to_string(),
            message: "workspace id is required for curl import".to_string(),
            details: None,
        });
    }

    match import_curl_to_draft(&payload.command) {
        Ok(draft) => ApiEnvelope::success(draft),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn analyze_openapi_import(
    _state: State<'_, AppState>,
    payload: ImportOpenApiAnalyzePayloadDto,
) -> ApiEnvelope<OpenApiImportAnalysisDto> {
    if payload.workspace_id.trim().is_empty() {
        return ApiEnvelope::failure(crate::errors::AppError {
            code: "INVALID_WORKSPACE".to_string(),
            message: "workspace id is required for OpenAPI import analysis".to_string(),
            details: None,
        });
    }

    match analyze_openapi_document(&payload.workspace_id, &payload.document) {
        Ok(analysis) => ApiEnvelope::success(analysis),
        Err(error) => ApiEnvelope::failure(error),
    }
}

#[tauri::command]
pub fn apply_openapi_import(
    state: State<'_, AppState>,
    payload: ImportOpenApiApplyPayloadDto,
) -> ApiEnvelope<OpenApiImportApplyResultDto> {
    if payload.workspace_id.trim().is_empty() {
        return ApiEnvelope::failure(crate::errors::AppError {
            code: "INVALID_WORKSPACE".to_string(),
            message: "workspace id is required for OpenAPI import apply".to_string(),
            details: None,
        });
    }

    match apply_openapi_import_to_workspace(&state.db_path, &payload) {
        Ok(result) => ApiEnvelope::success(result),
        Err(error) => ApiEnvelope::failure(error),
    }
}
