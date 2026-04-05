use std::collections::HashMap;

use reqwest::Url;

use crate::errors::AppError;
use crate::models::{
    AssertionResultSetDto, AuthConfigDto, CompiledRequestDto, ExecutionArtifactDto,
    KeyValueItemDto, NormalizedResponseDto, RequestAssertionResultDto, RequestBodyDto,
    RequestTestDefinitionDto, SendRequestPayloadDto,
};

fn error(code: &str, message: impl Into<String>) -> AppError {
    AppError {
        code: code.to_string(),
        message: message.into(),
        details: None,
    }
}

pub fn resolve_variables_map(items: &[KeyValueItemDto]) -> HashMap<String, String> {
    items
        .iter()
        .filter(|item| item.enabled && !item.key.trim().is_empty())
        .map(|item| (item.key.trim().to_string(), item.value.clone()))
        .collect()
}

pub fn resolve_template(template: &str, variables: &HashMap<String, String>) -> String {
    let mut output = String::with_capacity(template.len());
    let mut remaining = template;

    while let Some(start) = remaining.find("{{") {
        output.push_str(&remaining[..start]);
        let rest = &remaining[start + 2..];

        if let Some(end) = rest.find("}}") {
            let key = rest[..end].trim();
            output.push_str(variables.get(key).map(String::as_str).unwrap_or_default());
            remaining = &rest[end + 2..];
        } else {
            output.push_str("{{");
            output.push_str(rest);
            return output;
        }
    }

    output.push_str(remaining);
    output
}

fn resolve_protocol_key(url: &str) -> Result<String, AppError> {
    let parsed =
        Url::parse(url.trim()).map_err(|_| error("INVALID_URL", format!("invalid url: {url}")))?;

    match parsed.scheme() {
        "http" | "https" => Ok("http".to_string()),
        scheme => Err(error(
            "UNSUPPORTED_PROTOCOL",
            format!("unsupported protocol scheme: {scheme}"),
        )),
    }
}

fn resolve_items(
    items: &[KeyValueItemDto],
    variables: &HashMap<String, String>,
) -> Vec<KeyValueItemDto> {
    items
        .iter()
        .map(|item| KeyValueItemDto {
            key: resolve_template(&item.key, variables),
            value: resolve_template(&item.value, variables),
            description: item.description.clone(),
            enabled: item.enabled,
        })
        .collect()
}

fn resolve_auth(auth: &AuthConfigDto, variables: &HashMap<String, String>) -> AuthConfigDto {
    AuthConfigDto {
        r#type: auth.r#type.clone(),
        bearer_token: resolve_template(&auth.bearer_token, variables),
        username: resolve_template(&auth.username, variables),
        password: resolve_template(&auth.password, variables),
        api_key_key: resolve_template(&auth.api_key_key, variables),
        api_key_value: resolve_template(&auth.api_key_value, variables),
        api_key_placement: auth.api_key_placement.clone(),
    }
}

fn resolve_tests(
    tests: &[RequestTestDefinitionDto],
    variables: &HashMap<String, String>,
) -> Vec<RequestTestDefinitionDto> {
    tests
        .iter()
        .map(|test| RequestTestDefinitionDto {
            id: test.id.clone(),
            name: resolve_template(&test.name, variables),
            source: test.source.clone(),
            operator: test.operator.clone(),
            target: resolve_template(&test.target, variables),
            expected: resolve_template(&test.expected, variables),
        })
        .collect()
}

fn resolve_body(body: &RequestBodyDto, variables: &HashMap<String, String>) -> RequestBodyDto {
    match body {
        RequestBodyDto::Json { value } => RequestBodyDto::Json {
            value: resolve_template(value, variables),
        },
        RequestBodyDto::Raw {
            value,
            content_type,
        } => RequestBodyDto::Raw {
            value: resolve_template(value, variables),
            content_type: content_type
                .as_ref()
                .map(|content_type| resolve_template(content_type, variables)),
        },
        RequestBodyDto::FormData { fields } => RequestBodyDto::FormData {
            fields: fields
                .iter()
                .map(|field| crate::models::request::FormDataFieldDto {
                    key: resolve_template(&field.key, variables),
                    value: resolve_template(&field.value, variables),
                    enabled: field.enabled,
                    kind: field.kind.clone(),
                    file_name: field
                        .file_name
                        .as_ref()
                        .map(|file_name| resolve_template(file_name, variables)),
                    mime_type: field
                        .mime_type
                        .as_ref()
                        .map(|mime_type| resolve_template(mime_type, variables)),
                })
                .collect(),
        },
        RequestBodyDto::Binary {
            bytes_base64,
            file_name,
            mime_type,
        } => RequestBodyDto::Binary {
            bytes_base64: resolve_template(bytes_base64, variables),
            file_name: file_name
                .as_ref()
                .map(|file_name| resolve_template(file_name, variables)),
            mime_type: mime_type
                .as_ref()
                .map(|mime_type| resolve_template(mime_type, variables)),
        },
    }
}

pub fn compile_request(
    payload: &SendRequestPayloadDto,
    environment_variables: &[KeyValueItemDto],
) -> Result<CompiledRequestDto, AppError> {
    let variables = resolve_variables_map(environment_variables);
    let url = resolve_template(&payload.url, &variables);
    let protocol_key = resolve_protocol_key(&url)?;

    Ok(CompiledRequestDto {
        protocol_key,
        method: payload.method.clone(),
        url,
        params: resolve_items(&payload.params, &variables),
        headers: resolve_items(&payload.headers, &variables),
        body: resolve_body(&payload.body, &variables),
        auth: resolve_auth(&payload.auth, &variables),
        tests: resolve_tests(&payload.tests, &variables),
        execution_options: payload.execution_options.clone(),
    })
}

fn get_header_value(headers: &[crate::models::ResponseHeaderItemDto], target: &str) -> String {
    let normalized_target = target.trim().to_ascii_lowercase();
    headers
        .iter()
        .find(|header| header.key.trim().to_ascii_lowercase() == normalized_target)
        .map(|header| header.value.clone())
        .unwrap_or_default()
}

pub fn evaluate_assertions(
    tests: &[RequestTestDefinitionDto],
    response: &NormalizedResponseDto,
) -> AssertionResultSetDto {
    let results = tests
        .iter()
        .map(|test| {
            let name = if test.name.trim().is_empty() {
                "Unnamed test".to_string()
            } else {
                test.name.trim().to_string()
            };
            let target = test.target.trim();
            let expected = test.expected.trim();

            let actual = match test.source.as_str() {
                "status" => response.status.to_string(),
                "header" => get_header_value(&response.headers, target),
                _ => response.body.clone(),
            };

            let passed = match test.source.as_str() {
                "status" => match test.operator.as_str() {
                    "contains" => actual.contains(expected),
                    "exists" => !actual.is_empty(),
                    _ => actual == expected,
                },
                "header" => match test.operator.as_str() {
                    "exists" => !actual.is_empty(),
                    "contains" => actual.contains(expected),
                    _ => actual == expected,
                },
                _ => match test.operator.as_str() {
                    "exists" => !actual.is_empty(),
                    "equals" => actual == expected,
                    _ => actual.contains(expected),
                },
            };

            let qualifier = if test.source == "header" && !target.is_empty() {
                format!(" ({target})")
            } else {
                String::new()
            };

            RequestAssertionResultDto {
                id: test.id.clone(),
                name,
                passed,
                message: if passed {
                    format!("Passed{qualifier}")
                } else {
                    format!(
                        "Expected {}{}{}, got {}",
                        test.operator,
                        qualifier,
                        if expected.is_empty() {
                            String::new()
                        } else {
                            format!(" {expected}")
                        },
                        if actual.is_empty() {
                            "empty".to_string()
                        } else {
                            actual
                        }
                    )
                },
            }
        })
        .collect::<Vec<_>>();

    AssertionResultSetDto {
        passed: results.iter().all(|result| result.passed),
        results,
    }
}

pub fn build_execution_artifact(
    compiled_request: CompiledRequestDto,
    normalized_response: NormalizedResponseDto,
    assertion_results: AssertionResultSetDto,
    execution_source: String,
    executed_at_epoch_ms: u64,
) -> ExecutionArtifactDto {
    ExecutionArtifactDto {
        execution_source,
        executed_at_epoch_ms,
        compiled_request,
        normalized_response,
        assertion_results,
    }
}

pub fn compiled_request_to_history_payload(
    payload: &SendRequestPayloadDto,
    compiled_request: &CompiledRequestDto,
) -> SendRequestPayloadDto {
    SendRequestPayloadDto {
        workspace_id: payload.workspace_id.clone(),
        request_kind: payload.request_kind.clone(),
        mcp: payload.mcp.clone(),
        active_environment_id: payload.active_environment_id.clone(),
        tab_id: payload.tab_id.clone(),
        request_id: payload.request_id.clone(),
        name: payload.name.clone(),
        description: payload.description.clone(),
        tags: payload.tags.clone(),
        collection_name: payload.collection_name.clone(),
        method: compiled_request.method.clone(),
        url: compiled_request.url.clone(),
        params: compiled_request.params.clone(),
        headers: compiled_request.headers.clone(),
        body: compiled_request.body.clone(),
        auth: compiled_request.auth.clone(),
        tests: compiled_request.tests.clone(),
        mock: payload.mock.clone(),
        execution_options: payload.execution_options.clone(),
    }
}
