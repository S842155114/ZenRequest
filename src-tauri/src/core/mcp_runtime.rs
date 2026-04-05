use std::time::Instant;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue, ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use serde_json::{json, Value};

use crate::errors::AppError;
use crate::models::{
    McpExecutionArtifactDto, McpOperationInputDto, ResponseHeaderItemDto, SendMcpRequestPayloadDto,
    SendMcpRequestResultDto,
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
    let protocol_response = serde_json::from_str::<Value>(&response_text).unwrap_or_else(|_| Value::String(response_text.clone()));

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
            protocol_response: Some(protocol_response),
            selected_tool: match &payload.mcp.operation {
                McpOperationInputDto::ToolsCall { input } => input.schema.clone(),
                _ => None,
            },
            error_category: if status_code >= 400 {
                Some("transport".to_string())
            } else {
                None
            },
        }),
        history_item: None,
    })
}
