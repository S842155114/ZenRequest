use std::time::{SystemTime, UNIX_EPOCH};

use tauri::State;

use crate::core::app_state::AppState;
use crate::core::request_executor::execute_request;
use crate::errors::AppError;
use crate::models::{
    ApiEnvelope, AuthConfigDto, HistoryStoredPayloadDto, KeyValueItemDto, ResponseHeaderItemDto,
    SendRequestPayloadDto, SendRequestResultDto,
};
use crate::storage::db;

const HISTORY_PREVIEW_LIMIT_CHARS: usize = 64 * 1024;

fn now_epoch_ms() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

fn is_sensitive_header(key: &str) -> bool {
    let lower = key.trim().to_ascii_lowercase();
    matches!(lower.as_str(), "authorization" | "cookie" | "set-cookie")
        || lower.contains("api-key")
        || lower == "x-api-key"
}

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

fn redact_response_headers(headers: &[ResponseHeaderItemDto]) -> Vec<ResponseHeaderItemDto> {
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

fn redact_request_payload(payload: &SendRequestPayloadDto) -> SendRequestPayloadDto {
    let mut next = payload.clone();
    next.headers = redact_headers(&payload.headers);
    next.auth = redact_auth(&payload.auth);
    next
}

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

fn build_mock_send_result(payload: &SendRequestPayloadDto) -> Result<SendRequestResultDto, AppError> {
    let mock = payload
        .mock
        .as_ref()
        .filter(|mock| mock.enabled)
        .ok_or_else(|| AppError {
            code: "MOCK_TEMPLATE_MISSING".to_string(),
            message: "mock execution requested without an enabled template".to_string(),
            details: None,
        })?;

    let response_body = if mock.content_type.contains("application/json") {
        serde_json::from_str::<serde_json::Value>(&mock.body)
            .ok()
            .and_then(|value| serde_json::to_string_pretty(&value).ok())
            .unwrap_or_else(|| mock.body.clone())
    } else {
        mock.body.clone()
    };

    Ok(SendRequestResultDto {
        request_method: payload.method.clone(),
        request_url: payload.url.clone(),
        status: mock.status,
        status_text: mock.status_text.clone(),
        elapsed_ms: 0,
        size_bytes: response_body.as_bytes().len(),
        content_type: mock.content_type.clone(),
        response_body,
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
        execution_source: "mock".to_string(),
        history_item: None,
    })
}

#[tauri::command]
pub async fn send_request(
    state: State<'_, AppState>,
    payload: SendRequestPayloadDto,
) -> Result<ApiEnvelope<SendRequestResultDto>, AppError> {
    let response = match if payload.mock.as_ref().is_some_and(|mock| mock.enabled) {
        build_mock_send_result(&payload)
    } else {
        execute_request(&state.http_client, &payload).await
    } {
        Ok(mut result) => {
            let (preview, preview_truncated) = preview_response_body(&result.response_body);
            let redacted_snapshot = redact_request_payload(&payload);
            let stored = HistoryStoredPayloadDto {
                request_id: payload.request_id.clone(),
                request_name: payload.name.clone(),
                request_method: result.request_method.clone(),
                request_url: result.request_url.clone(),
                request_snapshot: redacted_snapshot,
                status: result.status,
                status_text: result.status_text.clone(),
                elapsed_ms: result.elapsed_ms,
                size_bytes: result.size_bytes,
                content_type: result.content_type.clone(),
                response_headers: redact_response_headers(&result.headers),
                response_preview: preview,
                truncated: result.truncated || preview_truncated,
                execution_source: result.execution_source.clone(),
                executed_at_epoch_ms: now_epoch_ms(),
            };

            result.history_item = match db::insert_history_item(&state.db_path, &payload.workspace_id, &stored) {
                Ok(item) => Some(item),
                Err(_) => None,
            };

            ApiEnvelope::success(result)
        }
        Err(error) => ApiEnvelope::failure(error),
    };

    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::{
        build_mock_send_result, preview_response_body, redact_request_payload, AuthConfigDto,
        KeyValueItemDto, SendRequestPayloadDto,
    };
    use crate::models::RequestBodyDto;
    use crate::models::request::RequestMockStateDto;

    #[test]
    fn redacts_sensitive_request_fields() {
        let payload = SendRequestPayloadDto {
            workspace_id: "workspace-1".to_string(),
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
}
