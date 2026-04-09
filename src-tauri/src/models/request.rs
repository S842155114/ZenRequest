use serde::{Deserialize, Serialize};

use crate::models::app::HistoryItemDto;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RequestRedirectPolicyDto {
    Follow,
    Manual,
    Error,
}

impl Default for RequestRedirectPolicyDto {
    fn default() -> Self {
        Self::Follow
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RequestProxyModeDto {
    Inherit,
    Off,
    Custom,
}

impl Default for RequestProxyModeDto {
    fn default() -> Self {
        Self::Inherit
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RequestProxySettingsDto {
    #[serde(default)]
    pub mode: RequestProxyModeDto,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

impl Default for RequestProxySettingsDto {
    fn default() -> Self {
        Self {
            mode: RequestProxyModeDto::Inherit,
            url: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RequestExecutionOptionsDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<u64>,
    #[serde(default)]
    pub redirect_policy: RequestRedirectPolicyDto,
    #[serde(default)]
    pub proxy: RequestProxySettingsDto,
    #[serde(default = "default_verify_ssl")]
    pub verify_ssl: bool,
}

impl Default for RequestExecutionOptionsDto {
    fn default() -> Self {
        Self {
            timeout_ms: None,
            redirect_policy: RequestRedirectPolicyDto::Follow,
            proxy: RequestProxySettingsDto::default(),
            verify_ssl: true,
        }
    }
}

fn default_verify_ssl() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct KeyValueItemDto {
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthConfigDto {
    pub r#type: String,
    pub bearer_token: String,
    pub username: String,
    pub password: String,
    pub api_key_key: String,
    pub api_key_value: String,
    pub api_key_placement: String,
}

impl Default for AuthConfigDto {
    fn default() -> Self {
        Self {
            r#type: "none".to_string(),
            bearer_token: String::new(),
            username: String::new(),
            password: String::new(),
            api_key_key: "X-API-Key".to_string(),
            api_key_value: String::new(),
            api_key_placement: "header".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestTestDefinitionDto {
    pub id: String,
    pub name: String,
    pub source: String,
    pub operator: String,
    #[serde(default)]
    pub target: String,
    #[serde(default)]
    pub expected: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestAssertionResultDto {
    pub id: String,
    pub name: String,
    pub passed: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FormDataFieldDto {
    pub key: String,
    #[serde(default)]
    pub value: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestMockStateDto {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub status: u16,
    #[serde(default)]
    pub status_text: String,
    #[serde(default)]
    pub content_type: String,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub headers: Vec<KeyValueItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RequestBodyDto {
    Json {
        value: String,
    },
    Raw {
        value: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        content_type: Option<String>,
    },
    FormData {
        fields: Vec<FormDataFieldDto>,
    },
    Binary {
        bytes_base64: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        file_name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        mime_type: Option<String>,
    },
}

impl Default for RequestBodyDto {
    fn default() -> Self {
        Self::Json {
            value: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SendRequestPayloadDto {
    pub workspace_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mcp: Option<McpRequestDefinitionDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub active_environment_id: Option<String>,
    pub tab_id: String,
    pub request_id: Option<String>,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub collection_name: String,
    pub method: String,
    pub url: String,
    pub params: Vec<KeyValueItemDto>,
    pub headers: Vec<KeyValueItemDto>,
    pub body: RequestBodyDto,
    pub auth: AuthConfigDto,
    #[serde(default)]
    pub tests: Vec<RequestTestDefinitionDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mock: Option<RequestMockStateDto>,
    #[serde(default)]
    pub execution_options: RequestExecutionOptionsDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpStdioConnectionConfigDto {
    #[serde(default)]
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpConnectionConfigDto {
    #[serde(default)]
    pub transport: String,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub headers: Vec<KeyValueItemDto>,
    #[serde(default)]
    pub auth: AuthConfigDto,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdio: Option<McpStdioConnectionConfigDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpInitializeInputDto {
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub client_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpToolSchemaSnapshotDto {
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_schema: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpResourceSnapshotDto {
    #[serde(default)]
    pub uri: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpResourceContentSnapshotDto {
    #[serde(default)]
    pub uri: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blob: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpToolsListInputDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpResourcesListInputDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpResourceReadInputDto {
    #[serde(default)]
    pub uri: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource: Option<McpResourceSnapshotDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpToolCallInputDto {
    #[serde(default)]
    pub tool_name: String,
    #[serde(default)]
    pub arguments: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schema: Option<McpToolSchemaSnapshotDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpPromptArgumentSnapshotDto {
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpPromptSnapshotDto {
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<Vec<McpPromptArgumentSnapshotDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpRootSnapshotDto {
    #[serde(default)]
    pub uri: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpPromptsListInputDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpPromptGetInputDto {
    #[serde(default)]
    pub prompt_name: String,
    #[serde(default)]
    pub arguments: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<McpPromptSnapshotDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum McpOperationInputDto {
    #[serde(rename = "initialize")]
    Initialize { input: McpInitializeInputDto },
    #[serde(rename = "tools.list", alias = "toolsList")]
    ToolsList { input: McpToolsListInputDto },
    #[serde(rename = "tools.call", alias = "toolsCall")]
    ToolsCall { input: McpToolCallInputDto },
    #[serde(rename = "resources.list", alias = "resourcesList")]
    ResourcesList { input: McpResourcesListInputDto },
    #[serde(rename = "resources.read", alias = "resourcesRead")]
    ResourcesRead { input: McpResourceReadInputDto },
    #[serde(rename = "prompts.list", alias = "promptsList")]
    PromptsList { input: McpPromptsListInputDto },
    #[serde(rename = "prompts.get", alias = "promptsGet")]
    PromptsGet { input: McpPromptGetInputDto },
}

impl Default for McpOperationInputDto {
    fn default() -> Self {
        Self::Initialize {
            input: McpInitializeInputDto::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpRequestDefinitionDto {
    pub connection: McpConnectionConfigDto,
    pub operation: McpOperationInputDto,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roots: Option<Vec<McpRootSnapshotDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SendMcpRequestPayloadDto {
    pub workspace_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub active_environment_id: Option<String>,
    pub tab_id: String,
    pub request_id: Option<String>,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub collection_name: String,
    pub request_kind: String,
    pub mcp: McpRequestDefinitionDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AssertionResultSetDto {
    #[serde(default)]
    pub passed: bool,
    #[serde(default)]
    pub results: Vec<RequestAssertionResultDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResponseHeaderItemDto {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CompiledRequestDto {
    #[serde(default)]
    pub protocol_key: String,
    #[serde(default)]
    pub method: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub params: Vec<KeyValueItemDto>,
    #[serde(default)]
    pub headers: Vec<KeyValueItemDto>,
    #[serde(default)]
    pub body: RequestBodyDto,
    #[serde(default)]
    pub auth: AuthConfigDto,
    #[serde(default)]
    pub tests: Vec<RequestTestDefinitionDto>,
    #[serde(default)]
    pub execution_options: RequestExecutionOptionsDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedResponseDto {
    #[serde(default)]
    pub status: u16,
    #[serde(default)]
    pub status_text: String,
    #[serde(default)]
    pub elapsed_ms: u64,
    #[serde(default)]
    pub size_bytes: usize,
    #[serde(default)]
    pub content_type: String,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub headers: Vec<ResponseHeaderItemDto>,
    #[serde(default)]
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionArtifactDto {
    #[serde(default = "default_execution_source")]
    pub execution_source: String,
    #[serde(default)]
    pub executed_at_epoch_ms: u64,
    #[serde(default)]
    pub compiled_request: CompiledRequestDto,
    #[serde(default)]
    pub normalized_response: NormalizedResponseDto,
    #[serde(default)]
    pub assertion_results: AssertionResultSetDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpExecutionArtifactDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stderr_summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_phase: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_state: Option<String>,
    #[serde(default)]
    pub transport: String,
    #[serde(default)]
    pub operation: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol_request: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol_response: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_tool: Option<McpToolSchemaSnapshotDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cached_tools: Option<Vec<McpToolSchemaSnapshotDto>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_resource: Option<McpResourceSnapshotDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cached_resources: Option<Vec<McpResourceSnapshotDto>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_contents: Option<Vec<McpResourceContentSnapshotDto>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_prompt: Option<McpPromptSnapshotDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cached_prompts: Option<Vec<McpPromptSnapshotDto>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roots: Option<Vec<McpRootSnapshotDto>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendRequestResultDto {
    pub request_method: String,
    pub request_url: String,
    pub status: u16,
    pub status_text: String,
    pub elapsed_ms: u64,
    pub size_bytes: usize,
    pub content_type: String,
    pub response_body: String,
    pub headers: Vec<ResponseHeaderItemDto>,
    pub truncated: bool,
    #[serde(default = "default_execution_source")]
    pub execution_source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assertion_results: Option<AssertionResultSetDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution_artifact: Option<ExecutionArtifactDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub history_item: Option<HistoryItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMcpRequestResultDto {
    pub request_method: String,
    pub request_url: String,
    pub status: u16,
    pub status_text: String,
    pub elapsed_ms: u64,
    pub size_bytes: usize,
    pub content_type: String,
    pub response_body: String,
    pub headers: Vec<ResponseHeaderItemDto>,
    pub truncated: bool,
    #[serde(default = "default_execution_source")]
    pub execution_source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mcp_artifact: Option<McpExecutionArtifactDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub history_item: Option<HistoryItemDto>,
}

impl Default for SendMcpRequestResultDto {
    fn default() -> Self {
        Self {
            request_method: "POST".to_string(),
            request_url: String::new(),
            status: 0,
            status_text: "NOT_IMPLEMENTED".to_string(),
            elapsed_ms: 0,
            size_bytes: 0,
            content_type: "application/json".to_string(),
            response_body: String::new(),
            headers: Vec::new(),
            truncated: false,
            execution_source: default_execution_source(),
            mcp_artifact: None,
            history_item: None,
        }
    }
}

impl Default for SendRequestResultDto {
    fn default() -> Self {
        Self {
            request_method: "GET".to_string(),
            request_url: String::new(),
            status: 0,
            status_text: "NOT_IMPLEMENTED".to_string(),
            elapsed_ms: 0,
            size_bytes: 0,
            content_type: "text/plain".to_string(),
            response_body: String::new(),
            headers: Vec::new(),
            truncated: false,
            execution_source: default_execution_source(),
            assertion_results: None,
            execution_artifact: None,
            history_item: None,
        }
    }
}

fn default_execution_source() -> String {
    "live".to_string()
}
