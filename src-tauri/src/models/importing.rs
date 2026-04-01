use serde::{Deserialize, Serialize};

use super::app::RequestPresetDto;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportCurlPayloadDto {
    pub workspace_id: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportOpenApiAnalyzePayloadDto {
    pub workspace_id: String,
    pub document: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportDiagnosticDto {
    pub code: String,
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenApiImportCandidateDto {
    pub collection_name: String,
    pub request: RequestPresetDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenApiCollectionSuggestionDto {
    pub name: String,
    pub request_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenApiImportSummaryDto {
    pub total_operation_count: usize,
    pub importable_request_count: usize,
    pub skipped_operation_count: usize,
    pub warning_diagnostic_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenApiImportAnalysisDto {
    pub version: String,
    pub workspace_id: String,
    pub source_kind: String,
    pub summary: OpenApiImportSummaryDto,
    #[serde(default)]
    pub diagnostics: Vec<ImportDiagnosticDto>,
    #[serde(default)]
    pub grouping_suggestions: Vec<OpenApiCollectionSuggestionDto>,
    #[serde(default)]
    pub candidates: Vec<OpenApiImportCandidateDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportOpenApiApplyPayloadDto {
    pub workspace_id: String,
    pub analysis: OpenApiImportAnalysisDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenApiImportApplyResultDto {
    pub imported_request_count: usize,
    pub skipped_operation_count: usize,
    pub warning_diagnostic_count: usize,
    #[serde(default)]
    pub collection_names: Vec<String>,
}
