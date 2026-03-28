use serde::{Deserialize, Serialize};

use crate::models::request::{
    AuthConfigDto, KeyValueItemDto, RequestMockStateDto, RequestTestDefinitionDto,
    ResponseHeaderItemDto, SendRequestPayloadDto,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme_mode: String,
    pub locale: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme_mode: "dark".to_string(),
            locale: "en".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResponseStateDto {
    pub response_body: String,
    pub status: u16,
    pub status_text: String,
    pub time: String,
    pub size: String,
    pub headers: Vec<ResponseHeaderItemDto>,
    pub content_type: String,
    pub request_method: String,
    pub request_url: String,
    #[serde(default = "default_execution_source")]
    pub execution_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestPresetDto {
    #[serde(default)]
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub method: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_name: Option<String>,
    #[serde(default)]
    pub params: Vec<KeyValueItemDto>,
    #[serde(default)]
    pub headers: Vec<KeyValueItemDto>,
    #[serde(default)]
    pub body: String,
    #[serde(default = "default_body_type")]
    pub body_type: String,
    #[serde(default)]
    pub auth: AuthConfigDto,
    #[serde(default)]
    pub tests: Vec<RequestTestDefinitionDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mock: Option<RequestMockStateDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestCollectionDto {
    #[serde(default)]
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub expanded: bool,
    #[serde(default)]
    pub requests: Vec<RequestPresetDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentDto {
    #[serde(default)]
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub variables: Vec<KeyValueItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItemDto {
    #[serde(default)]
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub name: String,
    pub method: String,
    pub time: String,
    pub status: u16,
    pub url: String,
    #[serde(default)]
    pub executed_at_epoch_ms: u64,
    #[serde(default)]
    pub status_text: String,
    #[serde(default)]
    pub elapsed_ms: u64,
    #[serde(default)]
    pub size_bytes: usize,
    #[serde(default)]
    pub content_type: String,
    #[serde(default)]
    pub truncated: bool,
    #[serde(default)]
    pub response_headers: Vec<ResponseHeaderItemDto>,
    #[serde(default)]
    pub response_preview: String,
    #[serde(default = "default_execution_source")]
    pub execution_source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_snapshot: Option<SendRequestPayloadDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestTabStateDto {
    #[serde(default)]
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub collection_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_id: Option<String>,
    #[serde(default)]
    pub method: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub params: Vec<KeyValueItemDto>,
    #[serde(default)]
    pub headers: Vec<KeyValueItemDto>,
    #[serde(default)]
    pub body: String,
    #[serde(default = "default_body_type")]
    pub body_type: String,
    #[serde(default)]
    pub auth: AuthConfigDto,
    #[serde(default)]
    pub tests: Vec<RequestTestDefinitionDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mock: Option<RequestMockStateDto>,
    #[serde(default)]
    pub response: ResponseStateDto,
    #[serde(default)]
    pub is_sending: bool,
    #[serde(default)]
    pub is_dirty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSessionDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_tab_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_environment_id: Option<String>,
    #[serde(default)]
    pub open_tabs: Vec<RequestTabStateDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSummaryDto {
    #[serde(default)]
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_template_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ImportConflictStrategy {
    Skip,
    Rename,
    Overwrite,
}

impl Default for ImportConflictStrategy {
    fn default() -> Self {
        Self::Rename
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExportPackageScopeDto {
    Workspace,
    Application,
}

impl Default for ExportPackageScopeDto {
    fn default() -> Self {
        Self::Workspace
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceExportPayloadDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_id: Option<String>,
    #[serde(default)]
    pub scope: ExportPackageScopeDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceExportDataDto {
    pub workspace: WorkspaceSummaryDto,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session: Option<WorkspaceSessionDto>,
    #[serde(default)]
    pub collections: Vec<RequestCollectionDto>,
    #[serde(default)]
    pub environments: Vec<EnvironmentDto>,
    #[serde(default)]
    pub history: Vec<WorkspaceHistoryExportItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceHistoryExportItemDto {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub request_name: String,
    pub request_method: String,
    pub request_url: String,
    pub request_snapshot: SendRequestPayloadDto,
    pub status: u16,
    pub status_text: String,
    pub elapsed_ms: u64,
    pub size_bytes: usize,
    pub content_type: String,
    #[serde(default)]
    pub response_headers: Vec<ResponseHeaderItemDto>,
    pub response_preview: String,
    pub truncated: bool,
    #[serde(default = "default_execution_source")]
    pub execution_source: String,
    pub executed_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceExportPackageDto {
    pub format_version: u32,
    #[serde(default)]
    pub scope: ExportPackageScopeDto,
    pub exported_at_epoch_ms: u64,
    pub settings: AppSettings,
    pub workspace: WorkspaceSummaryDto,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session: Option<WorkspaceSessionDto>,
    #[serde(default)]
    pub collections: Vec<RequestCollectionDto>,
    #[serde(default)]
    pub environments: Vec<EnvironmentDto>,
    #[serde(default)]
    pub history: Vec<WorkspaceHistoryExportItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationExportPackageDto {
    pub format_version: u32,
    pub scope: ExportPackageScopeDto,
    pub exported_at_epoch_ms: u64,
    pub settings: AppSettings,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_workspace_id: Option<String>,
    #[serde(default)]
    pub workspaces: Vec<WorkspaceExportDataDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ImportExportPackageDto {
    Workspace(WorkspaceExportPackageDto),
    Application(ApplicationExportPackageDto),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceExportResultDto {
    pub file_name: String,
    pub package_json: String,
    pub scope: ExportPackageScopeDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportWorkspacePayloadDto {
    pub package_json: String,
    #[serde(default)]
    pub conflict_strategy: ImportConflictStrategy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceImportResultDto {
    pub scope: ExportPackageScopeDto,
    pub workspace: WorkspaceSummaryDto,
    #[serde(default)]
    pub imported_workspace_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_workspace_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LegacyWorkspaceSnapshotDto {
    #[serde(default)]
    pub locale: String,
    #[serde(default)]
    pub theme_mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_environment_id: Option<String>,
    #[serde(default)]
    pub environments: Vec<EnvironmentDto>,
    #[serde(default)]
    pub collections: Vec<RequestCollectionDto>,
    #[serde(default)]
    pub history_items: Vec<HistoryItemDto>,
    #[serde(default)]
    pub open_tabs: Vec<RequestTabStateDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_tab_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppBootstrapPayload {
    pub settings: AppSettings,
    pub workspaces: Vec<WorkspaceSummaryDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_workspace_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session: Option<WorkspaceSessionDto>,
    #[serde(default)]
    pub collections: Vec<RequestCollectionDto>,
    #[serde(default)]
    pub environments: Vec<EnvironmentDto>,
    #[serde(default)]
    pub history: Vec<HistoryItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSaveResult {
    pub saved_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandAck {
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveWorkspacePayloadDto {
    pub workspace_id: String,
    pub session: WorkspaceSessionDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetActiveWorkspacePayloadDto {
    pub workspace_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspacePayloadDto {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteWorkspacePayloadDto {
    pub workspace_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionMutationPayloadDto {
    pub workspace_id: String,
    pub collection_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollectionPayloadDto {
    pub workspace_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCollectionPayloadDto {
    pub workspace_id: String,
    pub collection_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequestPayloadDto {
    pub workspace_id: String,
    pub collection_id: String,
    pub request: RequestPresetDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteRequestPayloadDto {
    pub workspace_id: String,
    pub request_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEnvironmentPayloadDto {
    pub workspace_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameEnvironmentPayloadDto {
    pub workspace_id: String,
    pub environment_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteEnvironmentPayloadDto {
    pub workspace_id: String,
    pub environment_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEnvironmentVariablesPayloadDto {
    pub workspace_id: String,
    pub environment_id: String,
    pub variables: Vec<KeyValueItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryQueryPayloadDto {
    pub workspace_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveHistoryItemPayloadDto {
    pub workspace_id: String,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct HistoryStoredPayloadDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub request_name: String,
    pub request_method: String,
    pub request_url: String,
    pub request_snapshot: SendRequestPayloadDto,
    pub status: u16,
    pub status_text: String,
    pub elapsed_ms: u64,
    pub size_bytes: usize,
    pub content_type: String,
    #[serde(default)]
    pub response_headers: Vec<ResponseHeaderItemDto>,
    pub response_preview: String,
    pub truncated: bool,
    #[serde(default = "default_execution_source")]
    pub execution_source: String,
    pub executed_at_epoch_ms: u64,
}

fn default_body_type() -> String {
    "json".to_string()
}

fn default_execution_source() -> String {
    "live".to_string()
}
