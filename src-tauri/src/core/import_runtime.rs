use reqwest::Url;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    AuthConfigDto, KeyValueItemDto, RequestBodyDto, RequestTabOriginDto, RequestTabStateDto,
    ResponseStateDto,
};
use crate::models::request::FormDataFieldDto;

const SCRATCH_PAD_COLLECTION_NAME: &str = "Scratch Pad";

#[derive(Debug, Clone)]
pub struct ImportPlan {
    pub adapter_key: String,
    pub source_kind: String,
    pub requests: Vec<ImportIntermediateRequest>,
}

#[derive(Debug, Clone)]
pub struct ImportIntermediateRequest {
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValueItemDto>,
    pub body: RequestBodyDto,
    pub auth: AuthConfigDto,
}

fn error(code: &str, message: impl Into<String>) -> AppError {
    AppError {
        code: code.to_string(),
        message: message.into(),
        details: None,
    }
}

fn tokenize_shell_command(command: &str) -> Result<Vec<String>, AppError> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_single = false;
    let mut in_double = false;
    let mut escaping = false;

    for ch in command.chars() {
        if escaping {
            if ch == '\n' {
                escaping = false;
                continue;
            }

            current.push(ch);
            escaping = false;
            continue;
        }

        if in_single {
            if ch == '\'' {
                in_single = false;
            } else {
                current.push(ch);
            }
            continue;
        }

        if in_double {
            match ch {
                '"' => in_double = false,
                '\\' => escaping = true,
                _ => current.push(ch),
            }
            continue;
        }

        match ch {
            '\'' => in_single = true,
            '"' => in_double = true,
            '\\' => escaping = true,
            ' ' | '\n' | '\t' | '\r' => {
                if !current.is_empty() {
                    tokens.push(current.clone());
                    current.clear();
                }
            }
            _ => current.push(ch),
        }
    }

    if escaping || in_single || in_double {
        return Err(error("INVALID_CURL_COMMAND", "unterminated quoted curl command"));
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    Ok(tokens)
}

fn split_header(header: &str) -> Result<(String, String), AppError> {
    let Some((key, value)) = header.split_once(':') else {
        return Err(error("INVALID_CURL_HEADER", format!("invalid curl header: {header}")));
    };

    Ok((key.trim().to_string(), value.trim().to_string()))
}

fn parse_basic_auth(value: &str) -> AuthConfigDto {
    let (username, password) = value.split_once(':').unwrap_or((value, ""));
    AuthConfigDto {
        r#type: "basic".to_string(),
        bearer_token: String::new(),
        username: username.to_string(),
        password: password.to_string(),
        api_key_key: "X-API-Key".to_string(),
        api_key_value: String::new(),
        api_key_placement: "header".to_string(),
    }
}

fn parse_form_field(value: &str) -> FormDataFieldDto {
    let (key, raw_value) = value.split_once('=').unwrap_or((value, ""));
    if let Some(file_reference) = raw_value.strip_prefix('@') {
        let file_name;
        let mut mime_type = None;

        if let Some((path_part, tail)) = file_reference.split_once(';') {
            file_name = path_part.rsplit('/').next().unwrap_or(path_part).to_string();
            for segment in tail.split(';') {
                if let Some(next_mime_type) = segment.strip_prefix("type=") {
                    mime_type = Some(next_mime_type.to_string());
                }
            }
        } else {
            file_name = file_reference.rsplit('/').next().unwrap_or(file_reference).to_string();
        }

        FormDataFieldDto {
            key: key.to_string(),
            value: String::new(),
            enabled: true,
            file_name: Some(file_name),
            mime_type,
        }
    } else {
        FormDataFieldDto {
            key: key.to_string(),
            value: raw_value.to_string(),
            enabled: true,
            file_name: None,
            mime_type: None,
        }
    }
}

fn classify_body(
    body_value: Option<String>,
    content_type: Option<&str>,
    form_fields: Vec<FormDataFieldDto>,
) -> RequestBodyDto {
    if !form_fields.is_empty() {
        return RequestBodyDto::FormData { fields: form_fields };
    }

    let value = body_value.unwrap_or_default();
    if value.is_empty() {
        return RequestBodyDto::Json {
            value: String::new(),
        };
    }

    let content_type = content_type.map(str::trim).filter(|value| !value.is_empty());
    let looks_like_json = serde_json::from_str::<serde_json::Value>(&value).is_ok();

    if looks_like_json {
        return RequestBodyDto::Json { value };
    }

    RequestBodyDto::Raw {
        value,
        content_type: content_type.map(ToString::to_string),
    }
}

fn derive_request_name(method: &str, url: &str) -> String {
    if let Ok(parsed) = Url::parse(url) {
        let path = parsed.path().trim();
        if !path.is_empty() && path != "/" {
            return format!("{method} {path}");
        }

        return format!("{method} {}", parsed.host_str().unwrap_or("Imported Request"));
    }

    format!("{method} Imported Request")
}

pub fn parse_curl_command(command: &str) -> Result<ImportPlan, AppError> {
    let tokens = tokenize_shell_command(command)?;
    if tokens.is_empty() || tokens[0] != "curl" {
        return Err(error("INVALID_CURL_COMMAND", "curl import requires a command starting with curl"));
    }

    let mut method: Option<String> = None;
    let mut url: Option<String> = None;
    let mut headers = Vec::new();
    let mut auth = AuthConfigDto::default();
    let mut body_value: Option<String> = None;
    let mut form_fields = Vec::new();
    let mut content_type: Option<String> = None;

    let mut index = 1usize;
    while index < tokens.len() {
        let token = &tokens[index];

        let consume_next = |index: &mut usize, tokens: &[String], option_name: &str| -> Result<String, AppError> {
            *index += 1;
            tokens.get(*index)
                .cloned()
                .ok_or_else(|| error("INVALID_CURL_COMMAND", format!("missing value for {option_name}")))
        };

        match token.as_str() {
            "-X" | "--request" => {
                method = Some(consume_next(&mut index, &tokens, token)?.to_uppercase());
            }
            "-H" | "--header" => {
                let header_value = consume_next(&mut index, &tokens, token)?;
                let (key, value) = split_header(&header_value)?;
                let lower_key = key.to_ascii_lowercase();
                if lower_key == "authorization" {
                    if let Some(token) = value.strip_prefix("Bearer ") {
                        auth.r#type = "bearer".to_string();
                        auth.bearer_token = token.trim().to_string();
                        index += 1;
                        continue;
                    }
                }
                if lower_key == "content-type" {
                    content_type = Some(value.clone());
                }
                headers.push(KeyValueItemDto {
                    key,
                    value,
                    description: String::new(),
                    enabled: true,
                });
            }
            "-d" | "--data" | "--data-raw" | "--data-binary" | "--data-urlencode" => {
                body_value = Some(consume_next(&mut index, &tokens, token)?);
                if method.is_none() {
                    method = Some("POST".to_string());
                }
            }
            "-F" | "--form" | "--form-string" => {
                form_fields.push(parse_form_field(&consume_next(&mut index, &tokens, token)?));
                if method.is_none() {
                    method = Some("POST".to_string());
                }
            }
            "-u" | "--user" => {
                auth = parse_basic_auth(&consume_next(&mut index, &tokens, token)?);
            }
            "--url" => {
                url = Some(consume_next(&mut index, &tokens, token)?);
            }
            "-I" | "--head" => method = Some("HEAD".to_string()),
            "-G" | "--get" => method = Some("GET".to_string()),
            "-A" | "--user-agent" => {
                headers.push(KeyValueItemDto {
                    key: "User-Agent".to_string(),
                    value: consume_next(&mut index, &tokens, token)?,
                    description: String::new(),
                    enabled: true,
                });
            }
            "-b" | "--cookie" => {
                headers.push(KeyValueItemDto {
                    key: "Cookie".to_string(),
                    value: consume_next(&mut index, &tokens, token)?,
                    description: String::new(),
                    enabled: true,
                });
            }
            "-L" | "--location" | "-k" | "--insecure" | "-s" | "--silent" | "--compressed" | "-i" | "--include" => {}
            _ if token.starts_with("--request=") => {
                method = token.split_once('=').map(|(_, value)| value.to_uppercase());
            }
            _ if token.starts_with("--header=") => {
                let (_, header_value) = token.split_once('=').expect("validated starts_with");
                let (key, value) = split_header(header_value)?;
                if key.eq_ignore_ascii_case("content-type") {
                    content_type = Some(value.clone());
                }
                headers.push(KeyValueItemDto {
                    key,
                    value,
                    description: String::new(),
                    enabled: true,
                });
            }
            _ if token.starts_with("--url=") => {
                url = token.split_once('=').map(|(_, value)| value.to_string());
            }
            _ if token.starts_with("-X") && token.len() > 2 => {
                method = Some(token[2..].to_uppercase());
            }
            _ if token.starts_with("-H") && token.len() > 2 => {
                let (key, value) = split_header(&token[2..])?;
                if key.eq_ignore_ascii_case("content-type") {
                    content_type = Some(value.clone());
                }
                headers.push(KeyValueItemDto {
                    key,
                    value,
                    description: String::new(),
                    enabled: true,
                });
            }
            _ if token.starts_with("-d") && token.len() > 2 => {
                body_value = Some(token[2..].to_string());
                if method.is_none() {
                    method = Some("POST".to_string());
                }
            }
            _ if token.starts_with("-u") && token.len() > 2 => {
                auth = parse_basic_auth(&token[2..]);
            }
            _ if token.starts_with("-F") && token.len() > 2 => {
                form_fields.push(parse_form_field(&token[2..]));
                if method.is_none() {
                    method = Some("POST".to_string());
                }
            }
            _ if !token.starts_with('-') && url.is_none() => {
                url = Some(token.clone());
            }
            _ => {}
        }

        index += 1;
    }

    let method = method.unwrap_or_else(|| {
        if body_value.as_ref().is_some() || !form_fields.is_empty() {
            "POST".to_string()
        } else {
            "GET".to_string()
        }
    });
    let url = url.ok_or_else(|| error("INVALID_CURL_COMMAND", "curl import requires a target URL"))?;
    let body = classify_body(body_value, content_type.as_deref(), form_fields);

    Ok(ImportPlan {
        adapter_key: "curl".to_string(),
        source_kind: "curl".to_string(),
        requests: vec![ImportIntermediateRequest {
            name: derive_request_name(&method, &url),
            method,
            url,
            headers,
            body,
            auth,
        }],
    })
}

fn body_to_tab_fields(body: &RequestBodyDto) -> (String, String, Option<String>, Vec<FormDataFieldDto>, Option<String>, Option<String>) {
    match body {
        RequestBodyDto::Json { value } => (
            value.clone(),
            "json".to_string(),
            None,
            Vec::new(),
            None,
            None,
        ),
        RequestBodyDto::Raw { value, content_type } => (
            value.clone(),
            "raw".to_string(),
            content_type.clone(),
            Vec::new(),
            None,
            None,
        ),
        RequestBodyDto::FormData { fields } => (
            fields
                .iter()
                .filter(|field| field.enabled && !field.key.trim().is_empty())
                .map(|field| format!("{}={}", field.key, field.value))
                .collect::<Vec<_>>()
                .join("\n"),
            "formdata".to_string(),
            None,
            fields.clone(),
            None,
            None,
        ),
        RequestBodyDto::Binary {
            bytes_base64,
            file_name,
            mime_type,
        } => (
            bytes_base64.clone(),
            "binary".to_string(),
            None,
            Vec::new(),
            file_name.clone(),
            mime_type.clone(),
        ),
    }
}

pub fn import_curl_to_draft(command: &str) -> Result<RequestTabStateDto, AppError> {
    let plan = parse_curl_command(command)?;
    if plan.adapter_key != "curl" || plan.source_kind != "curl" {
        return Err(error("INVALID_IMPORT_PLAN", "curl import produced an unexpected import plan"));
    }
    let request = plan
        .requests
        .into_iter()
        .next()
        .ok_or_else(|| error("INVALID_CURL_COMMAND", "curl import produced no requests"))?;
    let (body, body_type, body_content_type, form_data_fields, binary_file_name, binary_mime_type) =
        body_to_tab_fields(&request.body);

    Ok(RequestTabStateDto {
        id: format!("tab-import-{}", Uuid::new_v4()),
        request_id: None,
        origin: Some(RequestTabOriginDto {
            kind: "scratch".to_string(),
            request_id: None,
            history_item_id: None,
        }),
        persistence_state: Some("unsaved".to_string()),
        execution_state: Some("idle".to_string()),
        name: request.name,
        description: String::new(),
        tags: vec!["curl".to_string()],
        collection_name: SCRATCH_PAD_COLLECTION_NAME.to_string(),
        collection_id: None,
        method: request.method.clone(),
        url: request.url.clone(),
        params: Vec::new(),
        headers: request.headers,
        body,
        body_type,
        body_content_type,
        form_data_fields,
        binary_file_name,
        binary_mime_type,
        auth: request.auth,
        tests: Vec::new(),
        mock: None,
        response: ResponseStateDto {
            request_method: request.method,
            request_url: request.url,
            ..ResponseStateDto::default()
        },
        is_sending: false,
        is_dirty: true,
    })
}

#[cfg(test)]
mod tests {
    use super::{import_curl_to_draft, parse_curl_command};
    use crate::models::RequestBodyDto;

    #[test]
    fn parses_curl_commands_into_canonical_import_plans() {
        let plan = parse_curl_command(
            r#"curl -X POST https://example.com/orders -H "Authorization: Bearer demo-token" -H "Content-Type: application/json" -d "{\"ok\":true}""#,
        )
        .expect("curl plan");

        assert_eq!(plan.adapter_key, "curl");
        assert_eq!(plan.source_kind, "curl");
        assert_eq!(plan.requests.len(), 1);
        assert_eq!(plan.requests[0].method, "POST");
        assert_eq!(plan.requests[0].url, "https://example.com/orders");
        assert_eq!(plan.requests[0].auth.r#type, "bearer");
        assert_eq!(plan.requests[0].auth.bearer_token, "demo-token");
        assert!(matches!(plan.requests[0].body, RequestBodyDto::Json { .. }));
    }

    #[test]
    fn maps_curl_imports_into_editable_request_drafts() {
        let draft = import_curl_to_draft(
            r#"curl https://example.com/upload -F "file=@demo.txt;type=text/plain""#,
        )
        .expect("curl draft");

        assert_eq!(draft.origin.as_ref().map(|origin| origin.kind.as_str()), Some("scratch"));
        assert_eq!(draft.persistence_state.as_deref(), Some("unsaved"));
        assert_eq!(draft.body_type, "formdata");
        assert_eq!(draft.form_data_fields.len(), 1);
        assert_eq!(draft.form_data_fields[0].file_name.as_deref(), Some("demo.txt"));
        assert_eq!(draft.form_data_fields[0].mime_type.as_deref(), Some("text/plain"));
    }
}
