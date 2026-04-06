use tauri::State;

use crate::core::app_state::AppState;
use crate::errors::AppError;
use crate::models::{
    ApiEnvelope, SendMcpRequestPayloadDto, SendMcpRequestResultDto, SendRequestPayloadDto,
    SendRequestResultDto,
};
use crate::services::request_service;

#[cfg(test)]
use crate::models::{
    AuthConfigDto, CompiledRequestDto, KeyValueItemDto, NormalizedResponseDto,
    ResponseHeaderItemDto,
};

#[cfg(test)]
const HISTORY_PREVIEW_LIMIT_CHARS: usize = 64 * 1024;

#[cfg(test)]
fn is_sensitive_header(key: &str) -> bool {
    let lower = key.trim().to_ascii_lowercase();
    matches!(lower.as_str(), "authorization" | "cookie" | "set-cookie")
        || lower.contains("api-key")
        || lower == "x-api-key"
}

#[cfg(test)]
fn redact_headers(headers: &[KeyValueItemDto]) -> Vec<KeyValueItemDto> {
    headers
        .iter()
        .map(|header| {
            let mut next = header.clone();
            if is_sensitive_header(&next.key) && !next.value.is_empty() {
                next.value = "[REDACTED]".to_string();
            }
            next
        })
        .collect()
}

#[cfg(test)]
fn redact_auth(auth: &AuthConfigDto) -> AuthConfigDto {
    let mut next = auth.clone();
    if !next.bearer_token.is_empty() {
        next.bearer_token = "[REDACTED]".to_string();
    }
    if !next.password.is_empty() {
        next.password = "[REDACTED]".to_string();
    }
    if !next.api_key_value.is_empty() {
        next.api_key_value = "[REDACTED]".to_string();
    }
    next
}

#[cfg(test)]
fn redact_request_payload(payload: &SendRequestPayloadDto) -> SendRequestPayloadDto {
    let mut next = payload.clone();
    next.headers = redact_headers(&payload.headers);
    next.auth = redact_auth(&payload.auth);
    next
}

#[cfg(test)]
fn preview_response_body(body: &str) -> (String, bool) {
    let truncated = body.chars().count() > HISTORY_PREVIEW_LIMIT_CHARS;
    if truncated {
        (
            body.chars().take(HISTORY_PREVIEW_LIMIT_CHARS).collect(),
            true,
        )
    } else {
        (body.to_string(), false)
    }
}

#[cfg(test)]
fn build_mock_normalized_response(
    payload: &SendRequestPayloadDto,
    _compiled_request: &CompiledRequestDto,
) -> Result<NormalizedResponseDto, AppError> {
    let mock = payload
        .mock
        .as_ref()
        .filter(|mock| mock.enabled)
        .ok_or_else(|| AppError {
            code: "MOCK_TEMPLATE_MISSING".to_string(),
            message: "mock execution requested without an enabled template".to_string(),
            details: None,
        })?;

    let body = if mock.content_type.contains("application/json") {
        serde_json::from_str::<serde_json::Value>(&mock.body)
            .ok()
            .and_then(|value| serde_json::to_string_pretty(&value).ok())
            .unwrap_or_else(|| mock.body.clone())
    } else {
        mock.body.clone()
    };

    Ok(NormalizedResponseDto {
        status: mock.status,
        status_text: mock.status_text.clone(),
        elapsed_ms: 0,
        size_bytes: body.as_bytes().len(),
        content_type: if mock.content_type.is_empty() {
            "text/plain".to_string()
        } else {
            mock.content_type.clone()
        },
        body,
        headers: mock
            .headers
            .iter()
            .filter(|header| header.enabled)
            .map(|header| ResponseHeaderItemDto {
                key: header.key.clone(),
                value: header.value.clone(),
            })
            .collect(),
        truncated: false,
    })
}

#[cfg(test)]
fn build_mock_send_result(
    payload: &SendRequestPayloadDto,
) -> Result<SendRequestResultDto, AppError> {
    let compiled_request = CompiledRequestDto {
        protocol_key: "http".to_string(),
        method: payload.method.clone(),
        url: payload.url.clone(),
        params: payload.params.clone(),
        headers: payload.headers.clone(),
        body: payload.body.clone(),
        auth: payload.auth.clone(),
        tests: payload.tests.clone(),
        execution_options: payload.execution_options.clone(),
    };
    let normalized_response = build_mock_normalized_response(payload, &compiled_request)?;

    Ok(SendRequestResultDto {
        request_method: compiled_request.method,
        request_url: compiled_request.url,
        status: normalized_response.status,
        status_text: normalized_response.status_text.clone(),
        elapsed_ms: normalized_response.elapsed_ms,
        size_bytes: normalized_response.size_bytes,
        content_type: normalized_response.content_type.clone(),
        response_body: normalized_response.body,
        headers: normalized_response.headers,
        truncated: normalized_response.truncated,
        execution_source: "mock".to_string(),
        assertion_results: None,
        execution_artifact: None,
        history_item: None,
    })
}

#[tauri::command]
pub async fn send_request(
    state: State<'_, AppState>,
    payload: SendRequestPayloadDto,
) -> Result<ApiEnvelope<SendRequestResultDto>, AppError> {
    request_service::send_request(&state, payload).await
}

#[tauri::command]
pub async fn send_mcp_request(
    state: State<'_, AppState>,
    payload: SendMcpRequestPayloadDto,
) -> Result<ApiEnvelope<SendMcpRequestResultDto>, AppError> {
    request_service::send_mcp_request(&state, payload).await
}

#[cfg(test)]
mod tests {
    use super::{
        build_mock_send_result, preview_response_body, redact_request_payload, AuthConfigDto,
        KeyValueItemDto, SendRequestPayloadDto,
    };
    use crate::models::request::RequestMockStateDto;
    use crate::models::{NormalizedResponseDto, RequestBodyDto, RequestTestDefinitionDto};

    #[test]
    fn redacts_sensitive_request_fields() {
        let payload = SendRequestPayloadDto {
            workspace_id: "workspace-1".to_string(),
            request_kind: None,
            mcp: None,
            active_environment_id: None,
            tab_id: "tab-1".to_string(),
            request_id: Some("request-1".to_string()),
            name: "Demo".to_string(),
            description: String::new(),
            tags: Vec::new(),
            collection_name: "Demo".to_string(),
            method: "GET".to_string(),
            url: "https://example.com".to_string(),
            params: Vec::new(),
            headers: vec![
                KeyValueItemDto {
                    key: "Authorization".to_string(),
                    value: "Bearer secret".to_string(),
                    description: String::new(),
                    enabled: true,
                },
                KeyValueItemDto {
                    key: "Accept".to_string(),
                    value: "application/json".to_string(),
                    description: String::new(),
                    enabled: true,
                },
            ],
            body: RequestBodyDto::Raw {
                value: "{}".to_string(),
                content_type: None,
            },
            auth: AuthConfigDto {
                r#type: "bearer".to_string(),
                bearer_token: "secret-token".to_string(),
                username: "user".to_string(),
                password: "secret-password".to_string(),
                api_key_key: "X-API-Key".to_string(),
                api_key_value: "secret-api-key".to_string(),
                api_key_placement: "header".to_string(),
            },
            tests: Vec::new(),
            mock: None,
            execution_options: crate::models::RequestExecutionOptionsDto::default(),
        };

        let redacted = redact_request_payload(&payload);
        assert_eq!(redacted.headers[0].value, "[REDACTED]");
        assert_eq!(redacted.headers[1].value, "application/json");
        assert_eq!(redacted.auth.bearer_token, "[REDACTED]");
        assert_eq!(redacted.auth.password, "[REDACTED]");
        assert_eq!(redacted.auth.api_key_value, "[REDACTED]");
    }

    #[test]
    fn truncates_history_preview() {
        let body = "x".repeat(70_000);
        let (preview, truncated) = preview_response_body(&body);

        assert!(truncated);
        assert_eq!(preview.chars().count(), 64 * 1024);
    }

    #[test]
    fn builds_mock_send_results_from_request_local_mock_templates() {
        let payload = SendRequestPayloadDto {
            workspace_id: "workspace-1".to_string(),
            request_kind: None,
            mcp: None,
            active_environment_id: None,
            tab_id: "tab-1".to_string(),
            request_id: Some("request-1".to_string()),
            name: "Demo".to_string(),
            description: String::new(),
            tags: Vec::new(),
            collection_name: "Demo".to_string(),
            method: "POST".to_string(),
            url: "https://example.com/orders".to_string(),
            params: Vec::new(),
            headers: Vec::new(),
            body: RequestBodyDto::Json {
                value: "{}".to_string(),
            },
            auth: AuthConfigDto::default(),
            tests: Vec::new(),
            mock: Some(RequestMockStateDto {
                enabled: true,
                status: 202,
                status_text: "Accepted".to_string(),
                content_type: "application/json".to_string(),
                body: "{\"source\":\"mock\"}".to_string(),
                headers: vec![
                    KeyValueItemDto {
                        key: "X-Mock".to_string(),
                        value: "enabled".to_string(),
                        description: String::new(),
                        enabled: true,
                    },
                    KeyValueItemDto {
                        key: "X-Disabled".to_string(),
                        value: "ignore".to_string(),
                        description: String::new(),
                        enabled: false,
                    },
                ],
            }),
            execution_options: crate::models::RequestExecutionOptionsDto::default(),
        };

        let result = build_mock_send_result(&payload).expect("mock result");

        assert_eq!(result.status, 202);
        assert_eq!(result.status_text, "Accepted");
        assert_eq!(result.execution_source, "mock");
        assert_eq!(result.request_method, "POST");
        assert_eq!(result.request_url, "https://example.com/orders");
        assert_eq!(result.headers.len(), 1);
        assert_eq!(result.headers[0].key, "X-Mock");
        assert!(result.response_body.contains("\"source\": \"mock\""));
    }

    // [Gate A: Runtime Authority] — request compilation (variable resolution, protocol detection) is owned by the Rust runtime
    #[test]
    fn runtime_pipeline_compiles_requests_from_environment_variables() {
        let mut payload = SendRequestPayloadDto {
            workspace_id: "workspace-1".to_string(),
            request_kind: None,
            mcp: None,
            active_environment_id: Some("env-local".to_string()),
            tab_id: "tab-1".to_string(),
            request_id: Some("request-1".to_string()),
            name: "Orders".to_string(),
            description: String::new(),
            tags: Vec::new(),
            collection_name: "Demo".to_string(),
            method: "POST".to_string(),
            url: "{{baseUrl}}/orders".to_string(),
            params: vec![KeyValueItemDto {
                key: "page".to_string(),
                value: "{{page}}".to_string(),
                description: String::new(),
                enabled: true,
            }],
            headers: vec![KeyValueItemDto {
                key: "Authorization".to_string(),
                value: "Bearer {{token}}".to_string(),
                description: String::new(),
                enabled: true,
            }],
            body: RequestBodyDto::Raw {
                value: "{\"name\":\"{{customer}}\"}".to_string(),
                content_type: Some("application/json".to_string()),
            },
            auth: AuthConfigDto::default(),
            tests: Vec::new(),
            mock: None,
            execution_options: crate::models::RequestExecutionOptionsDto::default(),
        };
        payload.auth.bearer_token = "{{token}}".to_string();

        let compiled = crate::core::request_runtime::compile_request(
            &payload,
            &[
                KeyValueItemDto {
                    key: "baseUrl".to_string(),
                    value: "https://api.example.com".to_string(),
                    description: String::new(),
                    enabled: true,
                },
                KeyValueItemDto {
                    key: "page".to_string(),
                    value: "2".to_string(),
                    description: String::new(),
                    enabled: true,
                },
                KeyValueItemDto {
                    key: "token".to_string(),
                    value: "secret-token".to_string(),
                    description: String::new(),
                    enabled: true,
                },
                KeyValueItemDto {
                    key: "customer".to_string(),
                    value: "Zen".to_string(),
                    description: String::new(),
                    enabled: true,
                },
            ],
        )
        .expect("compiled request");

        assert_eq!(compiled.url, "https://api.example.com/orders");
        assert_eq!(compiled.params[0].value, "2");
        assert_eq!(compiled.headers[0].value, "Bearer secret-token");
        assert_eq!(compiled.auth.bearer_token, "secret-token");
        assert_eq!(compiled.protocol_key, "http");
    }

    // [Gate A: Runtime Authority] — assertion evaluation is authoritative in the Rust runtime

    #[test]
    fn runtime_pipeline_rejects_redacted_bearer_tokens() {
        let mut payload = SendRequestPayloadDto {
            workspace_id: "workspace-1".to_string(),
            request_kind: None,
            mcp: None,
            active_environment_id: Some("env-local".to_string()),
            tab_id: "tab-1".to_string(),
            request_id: Some("request-1".to_string()),
            name: "Orders".to_string(),
            description: String::new(),
            tags: Vec::new(),
            collection_name: "Demo".to_string(),
            method: "GET".to_string(),
            url: "https://api.example.com/orders".to_string(),
            params: Vec::new(),
            headers: Vec::new(),
            body: RequestBodyDto::Raw {
                value: String::new(),
                content_type: None,
            },
            auth: AuthConfigDto::default(),
            tests: Vec::new(),
            mock: None,
            execution_options: crate::models::RequestExecutionOptionsDto::default(),
        };
        payload.auth.r#type = "bearer".to_string();
        payload.auth.bearer_token = "[REDACTED]".to_string();

        let error = crate::core::request_runtime::compile_request(&payload, &[])
            .expect_err("redacted bearer token should be rejected");
        assert_eq!(error.code, "REDACTED_SECRET");
    }

    #[test]
    fn runtime_pipeline_rejects_redacted_api_key_values_from_environment() {
        let mut payload = SendRequestPayloadDto {
            workspace_id: "workspace-1".to_string(),
            request_kind: None,
            mcp: None,
            active_environment_id: Some("env-local".to_string()),
            tab_id: "tab-1".to_string(),
            request_id: Some("request-1".to_string()),
            name: "Orders".to_string(),
            description: String::new(),
            tags: Vec::new(),
            collection_name: "Demo".to_string(),
            method: "GET".to_string(),
            url: "https://api.example.com/orders".to_string(),
            params: Vec::new(),
            headers: Vec::new(),
            body: RequestBodyDto::Raw {
                value: String::new(),
                content_type: None,
            },
            auth: AuthConfigDto::default(),
            tests: Vec::new(),
            mock: None,
            execution_options: crate::models::RequestExecutionOptionsDto::default(),
        };
        payload.auth.r#type = "apiKey".to_string();
        payload.auth.api_key_value = "{{token}}".to_string();

        let error = crate::core::request_runtime::compile_request(
            &payload,
            &[KeyValueItemDto {
                key: "token".to_string(),
                value: "[REDACTED]".to_string(),
                description: String::new(),
                enabled: true,
            }],
        )
        .expect_err("redacted api key should be rejected");
        assert_eq!(error.code, "REDACTED_SECRET");
    }

    #[test]
    fn runtime_pipeline_evaluates_assertions_authoritatively() {
        let results = crate::core::request_runtime::evaluate_assertions(
            &[RequestTestDefinitionDto {
                id: "test-status".to_string(),
                name: "Status is 200".to_string(),
                source: "status".to_string(),
                operator: "equals".to_string(),
                target: String::new(),
                expected: "200".to_string(),
            }],
            &NormalizedResponseDto {
                status: 201,
                status_text: "Created".to_string(),
                elapsed_ms: 12,
                size_bytes: 24,
                content_type: "application/json".to_string(),
                body: "{\"ok\":true}".to_string(),
                headers: Vec::new(),
                truncated: false,
            },
        );

        assert!(!results.passed);
        assert_eq!(results.results.len(), 1);
        assert!(!results.results[0].passed);
        assert!(results.results[0].message.contains("Expected equals"));
    }
}
