use tauri::State;

use crate::core::app_state::AppState;
use crate::core::import_runtime::import_curl_to_draft;
use crate::models::{ApiEnvelope, ImportCurlPayloadDto, RequestTabStateDto};

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
