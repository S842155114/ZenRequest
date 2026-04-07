use std::time::Instant;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue, ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use serde_json::{json, Value};

use crate::errors::AppError;
use crate::models::{
    McpExecutionArtifactDto, McpOperationInputDto, McpPromptArgumentSnapshotDto, McpPromptSnapshotDto, McpResourceContentSnapshotDto,
    McpResourceSnapshotDto, ResponseHeaderItemDto, SendMcpRequestPayloadDto, SendMcpRequestResultDto,
};

fn error(code: &str, message: impl Into<String>) -> AppError {
    AppError {
        code: code.to_string(),
        message: message.into(),
        details: None,
    }
}

fn operation_name(operation: &McpOperationInputDto) -> &'static str {
    match operation {
        McpOperationInputDto::Initialize { .. } => "initialize",
        McpOperationInputDto::ToolsList { .. } => "tools.list",
        McpOperationInputDto::ToolsCall { .. } => "tools.call",
        McpOperationInputDto::ResourcesList { .. } => "resources.list",
        McpOperationInputDto::ResourcesRead { .. } => "resources.read",
        McpOperationInputDto::PromptsList { .. } => "prompts.list",
        McpOperationInputDto::PromptsGet { .. } => "prompts.get",
    }
}

fn build_protocol_request(payload: &SendMcpRequestPayloadDto) -> Result<Value, AppError> {
    let request_id = format!("{}:{}", payload.tab_id, operation_name(&payload.mcp.operation));
    match &payload.mcp.operation {
        McpOperationInputDto::Initialize { input } => Ok(json!({
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "initialize",
            "params": {
                "protocolVersion": input.protocol_version.clone().unwrap_or_else(|| "2024-11-05".to_string()),
                "clientInfo": {
                    "name": if input.client_name.trim().is_empty() { "ZenRequest" } else { input.client_name.trim() },
                    "version": if input.client_version.trim().is_empty() { "0.1.0" } else { input.client_version.trim() },
                },
                "capabilities": input.capabilities.clone().unwrap_or_else(|| json!({}))
            }
        })),
        McpOperationInputDto::ToolsList { input } => {
            let mut params = serde_json::Map::new();
            if let Some(cursor) = &input.cursor {
                if !cursor.trim().is_empty() {
                    params.insert("cursor".to_string(), Value::String(cursor.clone()));
                }
            }
            Ok(json!({
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "tools/list",
                "params": Value::Object(params),
            }))
        }
        McpOperationInputDto::ToolsCall { input } => {
            if input.tool_name.trim().is_empty() {
                return Err(error("MCP_TOOL_NAME_REQUIRED", "tool call requires a toolName"));
            }
            Ok(json!({
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "tools/call",
                "params": {
                    "name": input.tool_name,
                    "arguments": input.arguments.clone(),
                }
            }))
        }
        McpOperationInputDto::ResourcesList { input } => {
            let mut params = serde_json::Map::new();
            if let Some(cursor) = &input.cursor {
                if !cursor.trim().is_empty() {
                    params.insert("cursor".to_string(), Value::String(cursor.clone()));
                }
            }
            Ok(json!({
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "resources/list",
                "params": Value::Object(params),
            }))
        }
        McpOperationInputDto::ResourcesRead { input } => {
            if input.uri.trim().is_empty() {
                return Err(error("MCP_RESOURCE_URI_REQUIRED", "resource read requires a uri"));
            }
            Ok(json!({
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "resources/read",
                "params": {
                    "uri": input.uri,
                }
            }))
        }
        McpOperationInputDto::PromptsList { input } => {
            let mut params = serde_json::Map::new();
            if let Some(cursor) = &input.cursor {
                if !cursor.trim().is_empty() {
                    params.insert("cursor".to_string(), Value::String(cursor.clone()));
                }
            }
            Ok(json!({
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "prompts/list",
                "params": Value::Object(params),
            }))
        }
        McpOperationInputDto::PromptsGet { input } => {
            if input.prompt_name.trim().is_empty() {
                return Err(error("MCP_PROMPT_NAME_REQUIRED", "prompt get requires a promptName"));
            }
            Ok(json!({
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "prompts/get",
                "params": {
                    "name": input.prompt_name,
                    "arguments": input.arguments.clone(),
                }
            }))
        }
    }
}

fn build_headers(payload: &SendMcpRequestPayloadDto) -> Result<HeaderMap, AppError> {
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("application/json, text/event-stream"));
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    for item in &payload.mcp.connection.headers {
        if !item.enabled || item.key.trim().is_empty() {
            continue;
        }
        let name = HeaderName::from_bytes(item.key.trim().as_bytes())
            .map_err(|_| error("INVALID_HEADER", format!("invalid header name: {}", item.key)))?;
        let value = HeaderValue::from_str(item.value.as_str())
            .map_err(|_| error("INVALID_HEADER", format!("invalid header value: {}", item.key)))?;
        headers.insert(name, value);
    }

    if !matches!(payload.mcp.operation, McpOperationInputDto::Initialize { .. }) {
        if let Some(session_id) = &payload.mcp.connection.session_id {
            if !session_id.trim().is_empty() {
                let value = HeaderValue::from_str(session_id.trim())
                    .map_err(|_| error("INVALID_MCP_SESSION", "invalid mcp session id"))?;
                headers.insert(HeaderName::from_static("mcp-session-id"), value);
            }
        }
    }

    match payload.mcp.connection.auth.r#type.as_str() {
        "bearer" if !payload.mcp.connection.auth.bearer_token.trim().is_empty() => {
            let value = format!("Bearer {}", payload.mcp.connection.auth.bearer_token.trim());
            let header_value = HeaderValue::from_str(&value)
                .map_err(|_| error("INVALID_AUTH", "invalid bearer token"))?;
            headers.insert(AUTHORIZATION, header_value);
        }
        "apiKey"
            if !payload.mcp.connection.auth.api_key_key.trim().is_empty()
                && !payload.mcp.connection.auth.api_key_value.trim().is_empty()
                && payload.mcp.connection.auth.api_key_placement == "header" =>
        {
            let name = HeaderName::from_bytes(payload.mcp.connection.auth.api_key_key.trim().as_bytes())
                .map_err(|_| error("INVALID_AUTH", "invalid api key header name"))?;
            let value = HeaderValue::from_str(payload.mcp.connection.auth.api_key_value.as_str())
                .map_err(|_| error("INVALID_AUTH", "invalid api key value"))?;
            headers.insert(name, value);
        }
        _ => {}
    }

    Ok(headers)
}

fn extract_sse_payload(response_text: &str) -> Option<Value> {
    let data_lines = response_text
        .lines()
        .filter_map(|line| line.strip_prefix("data:"))
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();

    if data_lines.is_empty() {
        return None;
    }

    let joined = data_lines.join("\n");
    serde_json::from_str::<Value>(&joined).ok()
}

fn extract_cached_resources(protocol_response: &Value) -> Option<Vec<McpResourceSnapshotDto>> {
    let result = protocol_response.get("result")?.as_object()?;
    let resources = result.get("resources")?.as_array()?;

    Some(resources.iter().filter_map(|resource| {
        let object = resource.as_object()?;
        let uri = object.get("uri")?.as_str()?.trim().to_string();
        if uri.is_empty() {
            return None;
        }
        Some(McpResourceSnapshotDto {
            uri,
            name: object.get("name").and_then(|value| value.as_str()).map(|value| value.to_string()),
            title: object.get("title").and_then(|value| value.as_str()).map(|value| value.to_string()),
            description: object.get("description").and_then(|value| value.as_str()).map(|value| value.to_string()),
            mime_type: object.get("mimeType").and_then(|value| value.as_str()).map(|value| value.to_string()),
        })
    }).collect())
}

fn extract_cached_prompts(protocol_response: &Value) -> Option<Vec<McpPromptSnapshotDto>> {
    let result = protocol_response.get("result")?.as_object()?;
    let prompts = result.get("prompts")?.as_array()?;

    Some(prompts.iter().filter_map(|prompt| {
        let object = prompt.as_object()?;
        let name = object.get("name")?.as_str()?.trim().to_string();
        if name.is_empty() {
            return None;
        }
        let arguments = object
            .get("arguments")
            .and_then(|value| value.as_array())
            .map(|items| items.iter().filter_map(|item| {
                let argument = item.as_object()?;
                let arg_name = argument.get("name")?.as_str()?.trim().to_string();
                if arg_name.is_empty() {
                    return None;
                }
                Some(McpPromptArgumentSnapshotDto {
                    name: arg_name,
                    title: argument.get("title").and_then(|value| value.as_str()).map(|value| value.to_string()),
                    description: argument.get("description").and_then(|value| value.as_str()).map(|value| value.to_string()),
                    required: argument.get("required").and_then(|value| value.as_bool()),
                })
            }).collect::<Vec<_>>());
        Some(McpPromptSnapshotDto {
            name,
            title: object.get("title").and_then(|value| value.as_str()).map(|value| value.to_string()),
            description: object.get("description").and_then(|value| value.as_str()).map(|value| value.to_string()),
            arguments,
        })
    }).collect())
}

fn extract_resource_contents(protocol_response: &Value) -> Option<Vec<McpResourceContentSnapshotDto>> {
    let result = protocol_response.get("result")?.as_object()?;
    let contents = result.get("contents")?.as_array()?;

    Some(contents.iter().filter_map(|content| {
        let object = content.as_object()?;
        let uri = object.get("uri")?.as_str()?.trim().to_string();
        if uri.is_empty() {
            return None;
        }
        Some(McpResourceContentSnapshotDto {
            uri,
            mime_type: object.get("mimeType").and_then(|value| value.as_str()).map(|value| value.to_string()),
            text: object.get("text").and_then(|value| value.as_str()).map(|value| value.to_string()),
            blob: object.get("blob").and_then(|value| value.as_str()).map(|value| value.to_string()),
        })
    }).collect())
}

fn classify_protocol_error(status_code: u16, protocol_response: &Value) -> Option<String> {
    if status_code >= 400 {
        let message = protocol_response
            .get("error")
            .and_then(|error| error.get("message"))
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_lowercase();

        if message.contains("not initialized") || message.contains("initialize") || message.contains("session") {
            return Some("session".to_string());
        }

        return Some("transport".to_string());
    }

    if protocol_response.get("error").is_some() {
        let message = protocol_response
            .get("error")
            .and_then(|error| error.get("message"))
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_lowercase();

        if message.contains("not initialized") || message.contains("initialize") || message.contains("session") {
            return Some("session".to_string());
        }

        return Some("tool-call".to_string());
    }

    None
}

pub async fn execute_mcp_request(payload: &SendMcpRequestPayloadDto) -> Result<SendMcpRequestResultDto, AppError> {
    if payload.request_kind != "mcp" {
        return Err(error("INVALID_REQUEST_KIND", "send_mcp_request requires requestKind=mcp"));
    }
    if payload.mcp.connection.transport != "http" {
        return Err(error("UNSUPPORTED_MCP_TRANSPORT", format!("unsupported mcp transport: {}", payload.mcp.connection.transport)));
    }
    let base_url = payload.mcp.connection.base_url.trim();
    if base_url.is_empty() {
        return Err(error("INVALID_MCP_URL", "mcp connection requires a baseUrl"));
    }

    let protocol_request = build_protocol_request(payload)?;
    let client = reqwest::Client::builder()
        .user_agent("zenrequest/0.1.0")
        .build()
        .map_err(|err| error("MCP_CLIENT_BUILD_FAILED", err.to_string()))?;

    let started_at = Instant::now();
    let response = client
        .post(base_url)
        .headers(build_headers(payload)?)
        .json(&protocol_request)
        .send()
        .await
        .map_err(|err| error("MCP_REQUEST_FAILED", err.to_string()))?;
    let elapsed_ms = started_at.elapsed().as_millis() as u64;

    let status = response.status();
    let status_code = status.as_u16();
    let status_text = status.canonical_reason().unwrap_or("UNKNOWN").to_string();
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("application/json")
        .to_string();
    let session_id = response
        .headers()
        .get("mcp-session-id")
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string());
    let headers = response
        .headers()
        .iter()
        .map(|(key, value)| ResponseHeaderItemDto {
            key: key.to_string(),
            value: value.to_str().unwrap_or("").to_string(),
        })
        .collect::<Vec<_>>();
    let response_text = response
        .text()
        .await
        .map_err(|err| error("MCP_READ_BODY_FAILED", err.to_string()))?;
    let size_bytes = response_text.as_bytes().len();
    let protocol_response = if content_type.contains("text/event-stream") {
        extract_sse_payload(&response_text).unwrap_or_else(|| Value::String(response_text.clone()))
    } else {
        serde_json::from_str::<Value>(&response_text).unwrap_or_else(|_| Value::String(response_text.clone()))
    };
    let error_category = classify_protocol_error(status_code, &protocol_response);

    Ok(SendMcpRequestResultDto {
        request_method: "POST".to_string(),
        request_url: base_url.to_string(),
        status: status_code,
        status_text,
        elapsed_ms,
        size_bytes,
        content_type,
        response_body: serde_json::to_string_pretty(&protocol_response).unwrap_or(response_text),
        headers,
        truncated: false,
        execution_source: "live".to_string(),
        mcp_artifact: Some(McpExecutionArtifactDto {
            transport: payload.mcp.connection.transport.clone(),
            operation: operation_name(&payload.mcp.operation).to_string(),
            protocol_request: Some(protocol_request),
            protocol_response: Some(protocol_response.clone()),
            selected_tool: match &payload.mcp.operation {
                McpOperationInputDto::ToolsCall { input } => input.schema.clone(),
                _ => None,
            },
            cached_tools: None,
            selected_resource: match &payload.mcp.operation {
                McpOperationInputDto::ResourcesRead { input } => input.resource.clone().or_else(|| Some(McpResourceSnapshotDto {
                    uri: input.uri.clone(),
                    name: None,
                    title: None,
                    description: None,
                    mime_type: None,
                })),
                _ => None,
            },
            cached_resources: extract_cached_resources(&protocol_response),
            resource_contents: extract_resource_contents(&protocol_response),
            selected_prompt: match &payload.mcp.operation {
                McpOperationInputDto::PromptsGet { input } => input.prompt.clone().or_else(|| Some(McpPromptSnapshotDto {
                    name: input.prompt_name.clone(),
                    title: None,
                    description: None,
                    arguments: None,
                })),
                _ => None,
            },
            cached_prompts: extract_cached_prompts(&protocol_response),
            session_id,
            error_category,
        }),
        history_item: None,
    })
}


#[cfg(test)]
mod tests {
    use super::build_headers;
    use crate::models::{
        AuthConfigDto, McpConnectionConfigDto, McpInitializeInputDto, McpOperationInputDto,
        McpRequestDefinitionDto, McpToolsListInputDto, SendMcpRequestPayloadDto,
    };

    fn base_payload(operation: McpOperationInputDto) -> SendMcpRequestPayloadDto {
        SendMcpRequestPayloadDto {
            workspace_id: "workspace-1".to_string(),
            active_environment_id: None,
            tab_id: "tab-1".to_string(),
            request_id: None,
            name: "MCP".to_string(),
            description: String::new(),
            tags: Vec::new(),
            collection_name: "Scratch Pad".to_string(),
            request_kind: "mcp".to_string(),
            mcp: McpRequestDefinitionDto {
                connection: McpConnectionConfigDto {
                    transport: "http".to_string(),
                    base_url: "http://127.0.0.1:3000/mcp".to_string(),
                    headers: Vec::new(),
                    auth: AuthConfigDto::default(),
                    session_id: Some("session-1".to_string()),
                },
                operation,
            },
        }
    }

    #[test]
    fn initialize_does_not_send_mcp_session_id_header() {
        let payload = base_payload(McpOperationInputDto::Initialize {
            input: McpInitializeInputDto {
                client_name: "ZenRequest".to_string(),
                client_version: "0.1.0".to_string(),
                protocol_version: None,
                capabilities: None,
            },
        });

        let headers = build_headers(&payload).expect("headers");
        assert!(headers.get("mcp-session-id").is_none());
    }

    #[test]
    fn follow_up_requests_keep_mcp_session_id_header() {
        let payload = base_payload(McpOperationInputDto::ToolsList {
            input: McpToolsListInputDto { cursor: None },
        });

        let headers = build_headers(&payload).expect("headers");
        assert_eq!(headers.get("mcp-session-id").and_then(|v| v.to_str().ok()), Some("session-1"));
    }
}
