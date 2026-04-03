use std::time::Instant;

use base64::{engine::general_purpose, Engine as _};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::{Method, Proxy, Url};

use crate::errors::AppError;
use crate::models::request::{
    CompiledRequestDto, RequestBodyDto, RequestProxyModeDto, ResponseHeaderItemDto,
};
use crate::models::NormalizedResponseDto;

const RESPONSE_PREVIEW_LIMIT_BYTES: usize = 2 * 1024 * 1024;

fn error(code: &str, message: impl Into<String>) -> AppError {
    AppError {
        code: code.to_string(),
        message: message.into(),
        details: None,
    }
}

fn build_request_client(payload: &CompiledRequestDto) -> Result<reqwest::Client, AppError> {
    let mut builder = reqwest::Client::builder().user_agent("zenrequest/0.1.0");

    if let Some(timeout_ms) = payload.execution_options.timeout_ms {
        builder = builder.timeout(std::time::Duration::from_millis(timeout_ms));
    }

    builder = match payload.execution_options.redirect_policy {
        crate::models::request::RequestRedirectPolicyDto::Follow => builder,
        crate::models::request::RequestRedirectPolicyDto::Manual => {
            builder.redirect(reqwest::redirect::Policy::none())
        }
        crate::models::request::RequestRedirectPolicyDto::Error => builder.redirect(
            reqwest::redirect::Policy::custom(|attempt| attempt.error("redirect blocked by request policy")),
        ),
    };

    builder = match payload.execution_options.proxy.mode {
        RequestProxyModeDto::Inherit => builder,
        RequestProxyModeDto::Off => builder.no_proxy(),
        RequestProxyModeDto::Custom => {
            let proxy_url = payload
                .execution_options
                .proxy
                .url
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| error("INVALID_PROXY", "custom proxy requires a proxy url"))?;

            let proxy = Proxy::all(proxy_url)
                .map_err(|err| error("INVALID_PROXY", format!("invalid proxy url: {err}")))?;
            builder.proxy(proxy)
        }
    };

    builder = builder.danger_accept_invalid_certs(!payload.execution_options.verify_ssl);

    builder
        .build()
        .map_err(|err| error("HTTP_CLIENT_BUILD_FAILED", err.to_string()))
}

pub async fn execute_request(payload: &CompiledRequestDto) -> Result<NormalizedResponseDto, AppError> {
    if payload.protocol_key != "http" {
        return Err(error(
            "UNSUPPORTED_PROTOCOL",
            format!("unsupported protocol: {}", payload.protocol_key),
        ));
    }

    let client = build_request_client(payload)?;

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

                    let mut part = if field.kind.as_deref() == Some("file") {
                        let body_bytes = general_purpose::STANDARD
                            .decode(field.value.as_bytes())
                            .unwrap_or_else(|_| field.value.as_bytes().to_vec());
                        reqwest::multipart::Part::bytes(body_bytes)
                    } else {
                        reqwest::multipart::Part::text(field.value.clone())
                    };

                    if let Some(file_name) = &field.file_name {
                        part = part.file_name(file_name.to_string());
                    }
                    if let Some(mime_type) = &field.mime_type {
                        part = part
                            .mime_str(mime_type)
                            .map_err(|err| error("INVALID_MULTIPART_FIELD", err.to_string()))?;
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

    Ok(NormalizedResponseDto {
        status: status_code,
        status_text,
        elapsed_ms,
        size_bytes,
        content_type,
        body: response_body,
        headers: response_headers,
        truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::build_request_client;
    use base64::{engine::general_purpose, Engine as _};
    use crate::models::request::{
        AuthConfigDto, CompiledRequestDto, FormDataFieldDto, RequestBodyDto,
        RequestExecutionOptionsDto, RequestProxyModeDto, RequestProxySettingsDto,
        RequestRedirectPolicyDto,
    };

    fn compiled_request() -> CompiledRequestDto {
        CompiledRequestDto {
            protocol_key: "http".to_string(),
            method: "POST".to_string(),
            url: "https://example.com/upload".to_string(),
            params: Vec::new(),
            headers: Vec::new(),
            body: RequestBodyDto::Json {
                value: "{}".to_string(),
            },
            auth: AuthConfigDto::default(),
            tests: Vec::new(),
            execution_options: RequestExecutionOptionsDto::default(),
        }
    }

    #[test]
    fn builds_request_scoped_client_with_execution_options() {
        let mut payload = compiled_request();
        payload.execution_options = RequestExecutionOptionsDto {
            timeout_ms: Some(2_500),
            redirect_policy: RequestRedirectPolicyDto::Manual,
            proxy: RequestProxySettingsDto {
                mode: RequestProxyModeDto::Off,
                url: None,
            },
            verify_ssl: false,
        };

        let client = build_request_client(&payload).expect("client builds");
        client
            .get("https://example.com")
            .build()
            .expect("request builds");
    }

    #[test]
    fn rejects_custom_proxy_without_url() {
        let mut payload = compiled_request();
        payload.execution_options.proxy = RequestProxySettingsDto {
            mode: RequestProxyModeDto::Custom,
            url: None,
        };

        let error = build_request_client(&payload).expect_err("proxy should fail");
        assert_eq!(error.code, "INVALID_PROXY");
    }

    #[test]
    fn preserves_form_data_file_metadata() {
        let payload = CompiledRequestDto {
            body: RequestBodyDto::FormData {
                fields: vec![FormDataFieldDto {
                    key: "file".to_string(),
                    value: general_purpose::STANDARD.encode(b"hello"),
                    enabled: true,
                    kind: Some("file".to_string()),
                    file_name: Some("demo.txt".to_string()),
                    mime_type: Some("text/plain".to_string()),
                }],
            },
            ..compiled_request()
        };

        match payload.body {
            RequestBodyDto::FormData { fields } => {
                assert_eq!(fields[0].kind.as_deref(), Some("file"));
                assert_eq!(fields[0].file_name.as_deref(), Some("demo.txt"));
                assert_eq!(fields[0].mime_type.as_deref(), Some("text/plain"));
            }
            _ => panic!("expected form-data body"),
        }
    }
}
