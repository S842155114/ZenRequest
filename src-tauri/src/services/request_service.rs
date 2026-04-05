use crate::core::app_state::AppState;
use crate::core::mcp_runtime::execute_mcp_request;
use crate::core::request_executor::execute_request;
use crate::core::request_runtime::{
    build_execution_artifact, compile_request, compiled_request_to_history_payload,
    evaluate_assertions,
};
use crate::errors::AppError;
use crate::models::{
    ApiEnvelope, AuthConfigDto, HistoryStoredPayloadDto, KeyValueItemDto,
    NormalizedResponseDto, ResponseHeaderItemDto, SendMcpRequestPayloadDto,
    SendMcpRequestResultDto, SendRequestPayloadDto, SendRequestResultDto,
};
use crate::storage::db;
use std::time::{SystemTime, UNIX_EPOCH};

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
        (body.chars().take(HISTORY_PREVIEW_LIMIT_CHARS).collect(), true)
    } else {
        (body.to_string(), false)
    }
}

fn load_active_environment_variables(
    state: &AppState,
    payload: &SendRequestPayloadDto,
) -> Result<Vec<KeyValueItemDto>, AppError> {
    let Some(environment_id) = payload.active_environment_id.as_deref() else {
        return Ok(Vec::new());
    };

    let environments = db::list_environments(&state.db_path, &payload.workspace_id)?;
    Ok(environments
        .into_iter()
        .find(|environment| environment.id == environment_id)
        .map(|environment| environment.variables)
        .unwrap_or_default())
}

fn build_mock_normalized_response(
    payload: &SendRequestPayloadDto,
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

pub async fn send_request(
    state: &AppState,
    payload: SendRequestPayloadDto,
) -> Result<ApiEnvelope<SendRequestResultDto>, AppError> {
    let response = match load_active_environment_variables(state, &payload)
        .and_then(|variables| compile_request(&payload, &variables))
    {
        Ok(compiled_request) => {
            if !state
                .protocol_registry
                .supports(&compiled_request.protocol_key)
            {
                return Ok(ApiEnvelope::failure(AppError {
                    code: "UNSUPPORTED_PROTOCOL".to_string(),
                    message: format!("unsupported protocol: {}", compiled_request.protocol_key),
                    details: None,
                }));
            }

            let normalized_response = if payload.mock.as_ref().is_some_and(|mock| mock.enabled) {
                build_mock_normalized_response(&payload)
            } else {
                execute_request(&compiled_request).await
            };

            match normalized_response {
                Ok(normalized_response) => {
                    let assertion_results =
                        evaluate_assertions(&compiled_request.tests, &normalized_response);
                    let execution_source = if payload.mock.as_ref().is_some_and(|mock| mock.enabled)
                    {
                        "mock".to_string()
                    } else {
                        "live".to_string()
                    };
                    let executed_at_epoch_ms = now_epoch_ms();
                    let artifact = build_execution_artifact(
                        compiled_request.clone(),
                        normalized_response.clone(),
                        assertion_results.clone(),
                        execution_source.clone(),
                        executed_at_epoch_ms,
                    );
                    let (preview, preview_truncated) =
                        preview_response_body(&normalized_response.body);
                    let redacted_snapshot = redact_request_payload(
                        &compiled_request_to_history_payload(&payload, &compiled_request),
                    );
                    let stored = HistoryStoredPayloadDto {
                        request_id: payload.request_id.clone(),
                        request_name: payload.name.clone(),
                        request_method: compiled_request.method.clone(),
                        request_url: compiled_request.url.clone(),
                        request_snapshot: redacted_snapshot,
                        status: normalized_response.status,
                        status_text: normalized_response.status_text.clone(),
                        elapsed_ms: normalized_response.elapsed_ms,
                        size_bytes: normalized_response.size_bytes,
                        content_type: normalized_response.content_type.clone(),
                        response_headers: redact_response_headers(&normalized_response.headers),
                        response_preview: preview,
                        truncated: normalized_response.truncated || preview_truncated,
                        execution_source: execution_source.clone(),
                        executed_at_epoch_ms,
                    };

                    let history_item =
                        db::insert_history_item(&state.db_path, &payload.workspace_id, &stored).ok();

                    ApiEnvelope::success(SendRequestResultDto {
                        request_method: compiled_request.method.clone(),
                        request_url: compiled_request.url.clone(),
                        status: normalized_response.status,
                        status_text: normalized_response.status_text.clone(),
                        elapsed_ms: normalized_response.elapsed_ms,
                        size_bytes: normalized_response.size_bytes,
                        content_type: normalized_response.content_type.clone(),
                        response_body: normalized_response.body.clone(),
                        headers: normalized_response.headers.clone(),
                        truncated: normalized_response.truncated,
                        execution_source,
                        assertion_results: Some(assertion_results),
                        execution_artifact: Some(artifact),
                        history_item,
                    })
                }
                Err(error) => ApiEnvelope::failure(error),
            }
        }
        Err(error) => ApiEnvelope::failure(error),
    };

    Ok(response)
}


pub async fn send_mcp_request(
    state: &AppState,
    payload: SendMcpRequestPayloadDto,
) -> Result<ApiEnvelope<SendMcpRequestResultDto>, AppError> {
    match execute_mcp_request(&payload).await {
        Ok(mut result) => {
            let executed_at_epoch_ms = now_epoch_ms();
            let (preview, preview_truncated) = preview_response_body(&result.response_body);
            let request_snapshot = SendRequestPayloadDto {
                workspace_id: payload.workspace_id.clone(),
                request_kind: Some(payload.request_kind.clone()),
                mcp: Some(payload.mcp.clone()),
                active_environment_id: payload.active_environment_id.clone(),
                tab_id: payload.tab_id.clone(),
                request_id: payload.request_id.clone(),
                name: payload.name.clone(),
                description: payload.description.clone(),
                tags: payload.tags.clone(),
                collection_name: payload.collection_name.clone(),
                method: result.request_method.clone(),
                url: result.request_url.clone(),
                params: Vec::new(),
                headers: Vec::new(),
                body: crate::models::request::RequestBodyDto::Json {
                    value: String::new(),
                },
                auth: Default::default(),
                tests: Vec::new(),
                mock: None,
                execution_options: Default::default(),
            };
            let stored = HistoryStoredPayloadDto {
                request_id: payload.request_id.clone(),
                request_name: payload.name.clone(),
                request_method: result.request_method.clone(),
                request_url: result.request_url.clone(),
                request_snapshot,
                status: result.status,
                status_text: result.status_text.clone(),
                elapsed_ms: result.elapsed_ms,
                size_bytes: result.size_bytes,
                content_type: result.content_type.clone(),
                response_headers: redact_response_headers(&result.headers),
                response_preview: preview,
                truncated: result.truncated || preview_truncated,
                execution_source: result.execution_source.clone(),
                executed_at_epoch_ms,
            };

            result.history_item = db::insert_history_item(&state.db_path, &payload.workspace_id, &stored).ok();
            Ok(ApiEnvelope::success(result))
        }
        Err(error) => Ok(ApiEnvelope::failure(error)),
    }
}
