use std::time::Instant;

use base64::{engine::general_purpose, Engine as _};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::{Method, Url};

use crate::errors::AppError;
use crate::models::request::{RequestBodyDto, ResponseHeaderItemDto};
use crate::models::{SendRequestPayloadDto, SendRequestResultDto};

const RESPONSE_PREVIEW_LIMIT_BYTES: usize = 2 * 1024 * 1024;

fn error(code: &str, message: impl Into<String>) -> AppError {
    AppError {
        code: code.to_string(),
        message: message.into(),
        details: None,
    }
}

pub async fn execute_request(
    client: &reqwest::Client,
    payload: &SendRequestPayloadDto,
) -> Result<SendRequestResultDto, AppError> {
    let method = payload.method.parse::<Method>().map_err(|_| {
        error(
            "INVALID_METHOD",
            format!("invalid method: {}", payload.method),
        )
    })?;
    let mut url = Url::parse(payload.url.trim())
        .map_err(|_| error("INVALID_URL", format!("invalid url: {}", payload.url)))?;

    for param in &payload.params {
        if param.enabled && !param.key.trim().is_empty() {
            url.query_pairs_mut()
                .append_pair(param.key.trim(), param.value.as_str());
        }
    }

    let mut headers = HeaderMap::new();
    for item in &payload.headers {
        if !item.enabled || item.key.trim().is_empty() {
            continue;
        }

        let name = HeaderName::from_bytes(item.key.trim().as_bytes()).map_err(|_| {
            error(
                "INVALID_HEADER",
                format!("invalid header name: {}", item.key),
            )
        })?;
        let value = HeaderValue::from_str(item.value.as_str()).map_err(|_| {
            error(
                "INVALID_HEADER",
                format!("invalid header value: {}", item.key),
            )
        })?;
        headers.insert(name, value);
    }

    match payload.auth.r#type.as_str() {
        "bearer" if !payload.auth.bearer_token.trim().is_empty() => {
            let value = format!("Bearer {}", payload.auth.bearer_token.trim());
            let header_value = HeaderValue::from_str(&value)
                .map_err(|_| error("INVALID_AUTH", "invalid bearer token"))?;
            headers.insert(AUTHORIZATION, header_value);
        }
        "basic" if !payload.auth.username.is_empty() || !payload.auth.password.is_empty() => {
            let encoded = general_purpose::STANDARD.encode(format!(
                "{}:{}",
                payload.auth.username, payload.auth.password
            ));
            let value = format!("Basic {encoded}");
            let header_value = HeaderValue::from_str(&value)
                .map_err(|_| error("INVALID_AUTH", "invalid basic auth"))?;
            headers.insert(AUTHORIZATION, header_value);
        }
        "apiKey"
            if !payload.auth.api_key_key.trim().is_empty()
                && !payload.auth.api_key_value.trim().is_empty() =>
        {
            if payload.auth.api_key_placement == "query" {
                url.query_pairs_mut().append_pair(
                    payload.auth.api_key_key.trim(),
                    payload.auth.api_key_value.as_str(),
                );
            } else {
                let name = HeaderName::from_bytes(payload.auth.api_key_key.trim().as_bytes())
                    .map_err(|_| error("INVALID_AUTH", "invalid api key header name"))?;
                let value = HeaderValue::from_str(payload.auth.api_key_value.as_str())
                    .map_err(|_| error("INVALID_AUTH", "invalid api key value"))?;
                headers.insert(name, value);
            }
        }
        _ => {}
    }

    let mut request_builder = client.request(method.clone(), url).headers(headers.clone());
    match &payload.body {
        RequestBodyDto::Json { value } => {
            if !value.is_empty() && method != Method::GET && method != Method::HEAD {
                if !headers.contains_key(CONTENT_TYPE) {
                    request_builder = request_builder.header(CONTENT_TYPE, "application/json");
                }
                request_builder = request_builder.body(value.clone());
            }
        }
        RequestBodyDto::Raw {
            value,
            content_type,
        } => {
            if !value.is_empty() && method != Method::GET && method != Method::HEAD {
                if !headers.contains_key(CONTENT_TYPE) {
                    request_builder = request_builder.header(
                        CONTENT_TYPE,
                        content_type.as_deref().unwrap_or("text/plain"),
                    );
                }
                request_builder = request_builder.body(value.clone());
            }
        }
        RequestBodyDto::FormData { fields } => {
            if method != Method::GET && method != Method::HEAD {
                let mut form = reqwest::multipart::Form::new();
                for field in fields {
                    if !field.enabled || field.key.trim().is_empty() {
                        continue;
                    }

                    let mut part = reqwest::multipart::Part::text(field.value.clone());
                    if let Some(file_name) = &field.file_name {
                        part = part.file_name(file_name.to_string());
                    }
                    form = form.part(field.key.clone(), part);
                }

                request_builder = request_builder.multipart(form);
            }
        }
        RequestBodyDto::Binary {
            bytes_base64,
            mime_type,
            ..
        } => {
            if !bytes_base64.is_empty() && method != Method::GET && method != Method::HEAD {
                let body_bytes = general_purpose::STANDARD
                    .decode(bytes_base64.as_bytes())
                    .unwrap_or_else(|_| bytes_base64.as_bytes().to_vec());

                if !headers.contains_key(CONTENT_TYPE) {
                    request_builder = request_builder.header(
                        CONTENT_TYPE,
                        mime_type
                            .clone()
                            .unwrap_or_else(|| "application/octet-stream".to_string()),
                    );
                }
                request_builder = request_builder.body(body_bytes);
            }
        }
    }

    let started_at = Instant::now();
    let response = request_builder
        .send()
        .await
        .map_err(|err| error("HTTP_REQUEST_FAILED", err.to_string()))?;
    let elapsed_ms = started_at.elapsed().as_millis() as u64;

    let request_url = response.url().to_string();
    let status = response.status();
    let status_code = status.as_u16();
    let status_text = status.canonical_reason().unwrap_or("UNKNOWN").to_string();
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("text/plain")
        .to_string();
    let response_headers = response
        .headers()
        .iter()
        .map(|(key, value)| ResponseHeaderItemDto {
            key: key.to_string(),
            value: value.to_str().unwrap_or("").to_string(),
        })
        .collect::<Vec<_>>();

    let bytes = response
        .bytes()
        .await
        .map_err(|err| error("HTTP_READ_BODY_FAILED", err.to_string()))?;
    let size_bytes = bytes.len();
    let truncated = size_bytes > RESPONSE_PREVIEW_LIMIT_BYTES;
    let preview = if truncated {
        &bytes[..RESPONSE_PREVIEW_LIMIT_BYTES]
    } else {
        bytes.as_ref()
    };

    let mut response_body = String::from_utf8_lossy(preview).to_string();
    if !truncated && content_type.contains("application/json") {
        if let Ok(json_value) = serde_json::from_slice::<serde_json::Value>(&bytes) {
            if let Ok(pretty) = serde_json::to_string_pretty(&json_value) {
                response_body = pretty;
            }
        }
    }

    Ok(SendRequestResultDto {
        request_method: method.as_str().to_string(),
        request_url,
        status: status_code,
        status_text,
        elapsed_ms,
        size_bytes,
        content_type,
        response_body,
        headers: response_headers,
        truncated,
        history_item: None,
    })
}
