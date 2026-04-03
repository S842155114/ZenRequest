use std::path::Path;

use crate::core::import_runtime::{
    analyze_openapi_document, apply_openapi_import as apply_openapi_import_to_workspace,
    import_curl_to_draft,
};
use crate::errors::AppError;
use crate::models::{
    ImportOpenApiApplyPayloadDto, OpenApiImportAnalysisDto, OpenApiImportApplyResultDto,
    RequestTabStateDto,
};

fn validate_workspace_id(workspace_id: &str, action: &str) -> Result<(), AppError> {
    if workspace_id.trim().is_empty() {
        return Err(AppError {
            code: "INVALID_WORKSPACE".to_string(),
            message: format!("workspace id is required for {action}"),
            details: None,
        });
    }

    Ok(())
}

pub fn import_curl_request(
    workspace_id: &str,
    command: &str,
) -> Result<RequestTabStateDto, AppError> {
    validate_workspace_id(workspace_id, "curl import")?;
    import_curl_to_draft(command)
}

pub fn analyze_openapi_import(
    workspace_id: &str,
    document: &str,
) -> Result<OpenApiImportAnalysisDto, AppError> {
    validate_workspace_id(workspace_id, "OpenAPI import analysis")?;
    analyze_openapi_document(workspace_id, document)
}

pub fn apply_openapi_import(
    db_path: &Path,
    payload: &ImportOpenApiApplyPayloadDto,
) -> Result<OpenApiImportApplyResultDto, AppError> {
    validate_workspace_id(&payload.workspace_id, "OpenAPI import apply")?;
    apply_openapi_import_to_workspace(db_path, payload)
}
