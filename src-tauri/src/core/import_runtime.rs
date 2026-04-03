use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use openapiv3::{
    APIKeyLocation, Example, MediaType, OpenAPI, Operation, Parameter, ParameterData,
    ParameterSchemaOrContent, PathItem, ReferenceOr, RequestBody, Schema, SchemaKind,
    SecurityRequirement, SecurityScheme, Server, StringFormat, Type,
};
use reqwest::Url;
use serde::de::DeserializeOwned;
use serde_json::Value;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::request::FormDataFieldDto;
use crate::models::{
    AuthConfigDto, CreateCollectionPayloadDto, ImportDiagnosticDto, ImportOpenApiApplyPayloadDto,
    KeyValueItemDto, OpenApiCollectionSuggestionDto, OpenApiImportAnalysisDto,
    OpenApiImportApplyResultDto, OpenApiImportCandidateDto, OpenApiImportSummaryDto,
    RequestBodyDto, RequestPresetDto, RequestTabOriginDto, RequestTabStateDto, ResponseStateDto,
    SaveRequestPayloadDto,
};
use crate::storage::db;

const SCRATCH_PAD_COLLECTION_NAME: &str = "Scratch Pad";
const OPENAPI_ANALYSIS_VERSION: &str = "1";
const OPENAPI_SOURCE_KIND: &str = "openapi";
const OPENAPI_FALLBACK_COLLECTION_NAME: &str = "Imported OpenAPI";

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
        return Err(error(
            "INVALID_CURL_COMMAND",
            "unterminated quoted curl command",
        ));
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    Ok(tokens)
}

fn split_header(header: &str) -> Result<(String, String), AppError> {
    let Some((key, value)) = header.split_once(':') else {
        return Err(error(
            "INVALID_CURL_HEADER",
            format!("invalid curl header: {header}"),
        ));
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
            file_name = path_part
                .rsplit('/')
                .next()
                .unwrap_or(path_part)
                .to_string();
            for segment in tail.split(';') {
                if let Some(next_mime_type) = segment.strip_prefix("type=") {
                    mime_type = Some(next_mime_type.to_string());
                }
            }
        } else {
            file_name = file_reference
                .rsplit('/')
                .next()
                .unwrap_or(file_reference)
                .to_string();
        }

        FormDataFieldDto {
            key: key.to_string(),
            value: String::new(),
            enabled: true,
            kind: Some("file".to_string()),
            file_name: Some(file_name),
            mime_type,
        }
    } else {
        FormDataFieldDto {
            key: key.to_string(),
            value: raw_value.to_string(),
            enabled: true,
            kind: Some("text".to_string()),
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
        return RequestBodyDto::FormData {
            fields: form_fields,
        };
    }

    let value = body_value.unwrap_or_default();
    if value.is_empty() {
        return RequestBodyDto::Json {
            value: String::new(),
        };
    }

    let content_type = content_type
        .map(str::trim)
        .filter(|value| !value.is_empty());
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

        return format!(
            "{method} {}",
            parsed.host_str().unwrap_or("Imported Request")
        );
    }

    format!("{method} Imported Request")
}

fn normalize_method(method: &str) -> String {
    method.to_ascii_uppercase()
}

fn parse_openapi_source(document: &str) -> Result<Value, AppError> {
    serde_json::from_str::<Value>(document).or_else(|json_error| {
        serde_yaml::from_str::<Value>(document).map_err(|yaml_error| AppError {
            code: "OPENAPI_PARSE_ERROR".to_string(),
            message: "failed to parse OpenAPI document".to_string(),
            details: Some(format!("json: {json_error}; yaml: {yaml_error}")),
        })
    })
}

fn parse_openapi_document(document: &str) -> Result<(Value, OpenAPI), AppError> {
    let value = parse_openapi_source(document)?;
    let parsed = serde_json::from_value::<OpenAPI>(value.clone()).map_err(|error| AppError {
        code: "OPENAPI_PARSE_ERROR".to_string(),
        message: "failed to deserialize OpenAPI 3.0 document".to_string(),
        details: Some(error.to_string()),
    })?;

    if !parsed.openapi.starts_with("3.0") {
        return Err(AppError {
            code: "OPENAPI_UNSUPPORTED_VERSION".to_string(),
            message: format!("unsupported OpenAPI version: {}", parsed.openapi),
            details: None,
        });
    }

    Ok((value, parsed))
}

fn warning_diag(
    code: &str,
    message: impl Into<String>,
    location: impl Into<String>,
) -> ImportDiagnosticDto {
    ImportDiagnosticDto {
        code: code.to_string(),
        severity: "warning".to_string(),
        message: message.into(),
        location: Some(location.into()),
    }
}

fn skipped_diag(
    code: &str,
    message: impl Into<String>,
    location: impl Into<String>,
) -> ImportDiagnosticDto {
    ImportDiagnosticDto {
        code: code.to_string(),
        severity: "skipped".to_string(),
        message: message.into(),
        location: Some(location.into()),
    }
}

fn render_operation_location(method: &str, path: &str) -> String {
    format!("{} {}", normalize_method(method), path)
}

fn render_collection_name(spec_title: &str, tag: Option<&str>) -> String {
    match tag.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => format!("{spec_title} - {value}"),
        None => spec_title.to_string(),
    }
}

fn render_path_template(path: &str) -> String {
    let mut rendered = String::new();
    let mut in_token = false;
    let mut token = String::new();

    for ch in path.chars() {
        match ch {
            '{' if !in_token => {
                in_token = true;
                token.clear();
            }
            '}' if in_token => {
                rendered.push_str("{{");
                rendered.push_str(token.trim());
                rendered.push_str("}}");
                in_token = false;
                token.clear();
            }
            _ if in_token => token.push(ch),
            _ => rendered.push(ch),
        }
    }

    if in_token {
        rendered.push('{');
        rendered.push_str(&token);
    }

    rendered
}

fn join_server_and_path(base_url: Option<String>, path: &str) -> String {
    match base_url {
        None => render_path_template(path),
        Some(base) => {
            let rendered_path = render_path_template(path);
            if base == "/" {
                return rendered_path;
            }

            if base.ends_with('/') && rendered_path.starts_with('/') {
                format!("{}{}", base.trim_end_matches('/'), rendered_path)
            } else if !base.ends_with('/') && !rendered_path.starts_with('/') {
                format!("{base}/{rendered_path}")
            } else {
                format!("{base}{rendered_path}")
            }
        }
    }
}

fn resolve_reference_value<T: DeserializeOwned>(
    root: &Value,
    reference: &str,
) -> Result<T, String> {
    if !reference.starts_with("#/") {
        return Err(format!("external reference is not supported: {reference}"));
    }

    let pointer = &reference[1..];
    let value = root
        .pointer(pointer)
        .ok_or_else(|| format!("unresolved reference: {reference}"))?;
    serde_json::from_value::<T>(value.clone())
        .map_err(|error| format!("failed to deserialize resolved reference {reference}: {error}"))
}

fn resolve_reference_or<T: Clone + DeserializeOwned>(
    root: &Value,
    value: &ReferenceOr<T>,
) -> Result<T, String> {
    match value {
        ReferenceOr::Item(item) => Ok(item.clone()),
        ReferenceOr::Reference { reference } => resolve_reference_value(root, reference),
    }
}

fn resolve_boxed_schema(root: &Value, value: &ReferenceOr<Box<Schema>>) -> Result<Schema, String> {
    match value {
        ReferenceOr::Item(item) => Ok((**item).clone()),
        ReferenceOr::Reference { reference } => resolve_reference_value(root, reference),
    }
}

fn stringify_value(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::Bool(boolean) => boolean.to_string(),
        Value::Number(number) => number.to_string(),
        Value::String(text) => text.clone(),
        _ => serde_json::to_string(value).unwrap_or_default(),
    }
}

fn stringify_json_value(value: &Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "{}".to_string())
}

fn placeholder_from_name(name: &str) -> String {
    format!("{{{{{name}}}}}")
}

fn schema_default_value(schema: &Schema) -> Option<Value> {
    if let Some(example) = schema.schema_data.example.clone() {
        return Some(example);
    }
    if let Some(default) = schema.schema_data.default.clone() {
        return Some(default);
    }

    match &schema.schema_kind {
        SchemaKind::Type(Type::String(kind)) => kind
            .enumeration
            .iter()
            .find_map(|value| value.clone().map(Value::String)),
        SchemaKind::Type(Type::Number(kind)) => kind.enumeration.iter().find_map(|value| {
            value
                .and_then(serde_json::Number::from_f64)
                .map(Value::Number)
        }),
        SchemaKind::Type(Type::Integer(kind)) => kind
            .enumeration
            .iter()
            .find_map(|value| value.map(serde_json::Number::from).map(Value::Number)),
        SchemaKind::Type(Type::Boolean(kind)) => kind
            .enumeration
            .iter()
            .find_map(|value| value.map(Value::Bool)),
        _ => None,
    }
}

fn schema_placeholder_value(schema: &Schema, name: &str) -> Value {
    match &schema.schema_kind {
        SchemaKind::Type(Type::String(kind)) => {
            if matches!(
                kind.format,
                openapiv3::VariantOrUnknownOrEmpty::Item(StringFormat::Binary)
            ) {
                Value::String(String::new())
            } else {
                Value::String(placeholder_from_name(name))
            }
        }
        SchemaKind::Type(Type::Number(_))
        | SchemaKind::Type(Type::Integer(_))
        | SchemaKind::Type(Type::Boolean(_)) => Value::String(placeholder_from_name(name)),
        SchemaKind::Type(Type::Array(_)) => Value::Array(Vec::new()),
        SchemaKind::Type(Type::Object(_)) => Value::Object(serde_json::Map::new()),
        _ => Value::String(placeholder_from_name(name)),
    }
}

fn parameter_string_value(root: &Value, data: &ParameterData) -> Result<String, String> {
    if let Some(example) = data.example.as_ref() {
        return Ok(stringify_value(example));
    }

    if let Some(example_ref) = data.examples.values().next() {
        let example = resolve_reference_or::<Example>(root, example_ref)?;
        if let Some(value) = example.value {
            return Ok(stringify_value(&value));
        }
    }

    match &data.format {
        ParameterSchemaOrContent::Schema(schema_ref) => {
            let schema = resolve_reference_or::<Schema>(root, schema_ref)?;
            if let Some(value) = schema_default_value(&schema) {
                Ok(stringify_value(&value))
            } else {
                Ok(placeholder_from_name(&data.name))
            }
        }
        ParameterSchemaOrContent::Content(content) => {
            let media_type = content
                .values()
                .next()
                .ok_or_else(|| format!("parameter {} content is empty", data.name))?;
            if let Some(example) = media_type.example.as_ref() {
                return Ok(stringify_value(example));
            }

            if let Some(example_ref) = media_type.examples.values().next() {
                let example = resolve_reference_or::<Example>(root, example_ref)?;
                if let Some(value) = example.value {
                    return Ok(stringify_value(&value));
                }
            }

            Ok(placeholder_from_name(&data.name))
        }
    }
}

fn replace_server_variables(server: &Server, location: &str) -> (String, Vec<ImportDiagnosticDto>) {
    let mut warnings = Vec::new();
    let mut output = String::new();
    let mut token = String::new();
    let mut in_token = false;

    for ch in server.url.chars() {
        match ch {
            '{' if !in_token => {
                in_token = true;
                token.clear();
            }
            '}' if in_token => {
                let key = token.trim();
                let replacement = server
                    .variables
                    .as_ref()
                    .and_then(|variables| variables.get(key))
                    .map(|variable| variable.default.clone())
                    .unwrap_or_else(|| {
                        warnings.push(warning_diag(
                            "OPENAPI_UNRESOLVED_SERVER_VARIABLE",
                            format!("server variable `{key}` has no runtime default and will remain a template"),
                            location,
                        ));
                        placeholder_from_name(key)
                    });
                output.push_str(&replacement);
                in_token = false;
                token.clear();
            }
            _ if in_token => token.push(ch),
            _ => output.push(ch),
        }
    }

    if in_token {
        output.push('{');
        output.push_str(&token);
    }

    (output, warnings)
}

fn select_server_base_url(
    api: &OpenAPI,
    path_item: &PathItem,
    operation: &Operation,
    location: &str,
) -> (Option<String>, Vec<ImportDiagnosticDto>) {
    let server = operation
        .servers
        .first()
        .or_else(|| path_item.servers.first())
        .or_else(|| api.servers.first());

    match server {
        Some(server) => {
            let (url, warnings) = replace_server_variables(server, location);
            (Some(url), warnings)
        }
        None => (
            None,
            vec![warning_diag(
                "OPENAPI_MISSING_SERVER",
                "no server definition found; request URL will stay path-relative",
                location,
            )],
        ),
    }
}

fn insert_or_replace_parameter(parameters: &mut Vec<Parameter>, next: Parameter) {
    let next_key = (
        next.parameter_data_ref().name.clone(),
        match &next {
            Parameter::Query { .. } => "query",
            Parameter::Header { .. } => "header",
            Parameter::Path { .. } => "path",
            Parameter::Cookie { .. } => "cookie",
        },
    );

    if let Some(index) = parameters.iter().position(|parameter| {
        let key = (
            parameter.parameter_data_ref().name.as_str(),
            match parameter {
                Parameter::Query { .. } => "query",
                Parameter::Header { .. } => "header",
                Parameter::Path { .. } => "path",
                Parameter::Cookie { .. } => "cookie",
            },
        );
        key.0 == next_key.0 && key.1 == next_key.1
    }) {
        parameters[index] = next;
    } else {
        parameters.push(next);
    }
}

fn collect_parameters(
    root: &Value,
    path_item: &PathItem,
    operation: &Operation,
    location: &str,
) -> Result<Vec<Parameter>, ImportDiagnosticDto> {
    let mut parameters = Vec::new();

    for source in path_item
        .parameters
        .iter()
        .chain(operation.parameters.iter())
    {
        let resolved = resolve_reference_or::<Parameter>(root, source).map_err(|message| {
            let code = if message.contains("external reference") {
                "OPENAPI_EXTERNAL_REFERENCE"
            } else {
                "OPENAPI_UNRESOLVED_REFERENCE"
            };
            skipped_diag(code, message, location)
        })?;
        insert_or_replace_parameter(&mut parameters, resolved);
    }

    Ok(parameters)
}

fn derive_request_name_from_operation(method: &str, path: &str, operation: &Operation) -> String {
    operation
        .summary
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .or_else(|| {
            operation
                .operation_id
                .as_ref()
                .map(|value| value.trim())
                .filter(|value| !value.is_empty())
                .map(ToString::to_string)
        })
        .unwrap_or_else(|| format!("{} {}", normalize_method(method), path))
}

fn derive_form_fields_from_schema(
    root: &Value,
    schema: &Schema,
) -> Result<Vec<FormDataFieldDto>, String> {
    let mut fields = Vec::new();

    match &schema.schema_kind {
        SchemaKind::Type(Type::Object(object_type)) => {
            for (name, property) in &object_type.properties {
                let resolved = resolve_boxed_schema(root, property)?;
                let value = schema_default_value(&resolved)
                    .unwrap_or_else(|| schema_placeholder_value(&resolved, name));
                let is_binary = matches!(
                    &resolved.schema_kind,
                    SchemaKind::Type(Type::String(kind))
                        if matches!(
                            kind.format,
                            openapiv3::VariantOrUnknownOrEmpty::Item(StringFormat::Binary)
                        )
                );
                fields.push(FormDataFieldDto {
                    key: name.clone(),
                    value: if is_binary {
                        String::new()
                    } else {
                        stringify_value(&value)
                    },
                    enabled: true,
                    kind: Some(if is_binary { "file" } else { "text" }.to_string()),
                    file_name: None,
                    mime_type: None,
                });
            }
        }
        _ => {}
    }

    Ok(fields)
}

fn derive_urlencoded_body_from_schema(root: &Value, schema: &Schema) -> Result<String, String> {
    let mut parts = Vec::new();

    if let SchemaKind::Type(Type::Object(object_type)) = &schema.schema_kind {
        for (name, property) in &object_type.properties {
            let resolved = resolve_boxed_schema(root, property)?;
            let value = schema_default_value(&resolved)
                .unwrap_or_else(|| schema_placeholder_value(&resolved, name));
            parts.push(format!("{name}={}", stringify_value(&value)));
        }
    }

    Ok(parts.join("&"))
}

fn media_type_precedence<'a>(
    content: &'a BTreeMap<String, &'a MediaType>,
) -> Option<(&'a str, &'a MediaType)> {
    for preferred in [
        "application/json",
        "multipart/form-data",
        "application/x-www-form-urlencoded",
    ] {
        if let Some(media_type) = content.get(preferred) {
            return Some((preferred, *media_type));
        }
    }

    content
        .iter()
        .next()
        .map(|(key, value)| (key.as_str(), *value))
}

fn resolve_example_value(root: &Value, media_type: &MediaType) -> Result<Option<Value>, String> {
    if let Some(value) = media_type.example.as_ref() {
        return Ok(Some(value.clone()));
    }

    if let Some(example_ref) = media_type.examples.values().next() {
        let example = resolve_reference_or::<Example>(root, example_ref)?;
        return Ok(example.value);
    }

    Ok(None)
}

fn map_request_body(
    root: &Value,
    operation: &Operation,
    location: &str,
) -> Result<
    (
        String,
        String,
        Option<String>,
        Vec<FormDataFieldDto>,
        Option<String>,
        Option<String>,
        Vec<ImportDiagnosticDto>,
    ),
    ImportDiagnosticDto,
> {
    let Some(body_ref) = operation.request_body.as_ref() else {
        return Ok((
            String::new(),
            "json".to_string(),
            None,
            Vec::new(),
            None,
            None,
            Vec::new(),
        ));
    };

    let request_body = resolve_reference_or::<RequestBody>(root, body_ref).map_err(|message| {
        let code = if message.contains("external reference") {
            "OPENAPI_EXTERNAL_REFERENCE"
        } else {
            "OPENAPI_UNRESOLVED_REFERENCE"
        };
        skipped_diag(code, message, location)
    })?;

    let content = request_body
        .content
        .iter()
        .map(|(key, value)| (key.clone(), value))
        .collect::<BTreeMap<_, _>>();

    let Some((content_type, media_type)) = media_type_precedence(&content) else {
        return Ok((
            String::new(),
            "json".to_string(),
            None,
            Vec::new(),
            None,
            None,
            vec![warning_diag(
                "OPENAPI_UNSUPPORTED_MEDIA_TYPE",
                "request body is declared without content entries",
                location,
            )],
        ));
    };

    let example_value = resolve_example_value(root, media_type)
        .map_err(|message| skipped_diag("OPENAPI_UNRESOLVED_REFERENCE", message, location))?;

    match content_type {
        "application/json" => {
            let body = example_value
                .as_ref()
                .map(stringify_json_value)
                .unwrap_or_else(|| "{}".to_string());
            Ok((
                body,
                "json".to_string(),
                None,
                Vec::new(),
                None,
                None,
                Vec::new(),
            ))
        }
        "multipart/form-data" => {
            let schema = media_type
                .schema
                .as_ref()
                .map(|value| resolve_reference_or::<Schema>(root, value))
                .transpose()
                .map_err(|message| {
                    skipped_diag("OPENAPI_UNRESOLVED_REFERENCE", message, location)
                })?;

            let fields = if let Some(Value::Object(map)) = example_value.as_ref() {
                map.iter()
                    .map(|(key, value)| FormDataFieldDto {
                        key: key.clone(),
                        value: stringify_value(value),
                        enabled: true,
                        kind: Some("text".to_string()),
                        file_name: None,
                        mime_type: None,
                    })
                    .collect()
            } else if let Some(schema) = schema.as_ref() {
                derive_form_fields_from_schema(root, schema).map_err(|message| {
                    skipped_diag("OPENAPI_UNRESOLVED_REFERENCE", message, location)
                })?
            } else {
                Vec::new()
            };

            let body = fields
                .iter()
                .map(|field| format!("{}={}", field.key, field.value))
                .collect::<Vec<_>>()
                .join("\n");

            Ok((
                body,
                "formdata".to_string(),
                None,
                fields,
                None,
                None,
                Vec::new(),
            ))
        }
        "application/x-www-form-urlencoded" => {
            let schema = media_type
                .schema
                .as_ref()
                .map(|value| resolve_reference_or::<Schema>(root, value))
                .transpose()
                .map_err(|message| {
                    skipped_diag("OPENAPI_UNRESOLVED_REFERENCE", message, location)
                })?;

            let body = if let Some(Value::Object(map)) = example_value.as_ref() {
                map.iter()
                    .map(|(key, value)| format!("{key}={}", stringify_value(value)))
                    .collect::<Vec<_>>()
                    .join("&")
            } else if let Some(schema) = schema.as_ref() {
                derive_urlencoded_body_from_schema(root, schema).map_err(|message| {
                    skipped_diag("OPENAPI_UNRESOLVED_REFERENCE", message, location)
                })?
            } else {
                String::new()
            };

            Ok((
                body,
                "raw".to_string(),
                Some(content_type.to_string()),
                Vec::new(),
                None,
                None,
                Vec::new(),
            ))
        }
        other => {
            let body = example_value
                .as_ref()
                .map(stringify_value)
                .unwrap_or_default();
            let warnings = vec![warning_diag(
                "OPENAPI_UNSUPPORTED_MEDIA_TYPE",
                format!("request body media type `{other}` is imported as raw content"),
                location,
            )];
            Ok((
                body,
                "raw".to_string(),
                Some(other.to_string()),
                Vec::new(),
                None,
                None,
                warnings,
            ))
        }
    }
}

fn map_security_requirement(
    root: &Value,
    api: &OpenAPI,
    requirement: &SecurityRequirement,
    location: &str,
) -> (Option<AuthConfigDto>, Vec<ImportDiagnosticDto>) {
    let mut warnings = Vec::new();

    if requirement.len() > 1 {
        warnings.push(warning_diag(
            "OPENAPI_UNSUPPORTED_SECURITY_SCHEME",
            "multiple simultaneous security schemes are not fully modeled; using the first supported scheme",
            location,
        ));
    }

    for scheme_name in requirement.keys() {
        let scheme_ref = api
            .components
            .as_ref()
            .and_then(|components| components.security_schemes.get(scheme_name));

        let Some(scheme_ref) = scheme_ref else {
            warnings.push(warning_diag(
                "OPENAPI_UNSUPPORTED_SECURITY_SCHEME",
                format!("security scheme `{scheme_name}` is not defined in components"),
                location,
            ));
            continue;
        };

        let resolved = match resolve_reference_or::<SecurityScheme>(root, scheme_ref) {
            Ok(value) => value,
            Err(message) => {
                warnings.push(warning_diag(
                    "OPENAPI_UNSUPPORTED_SECURITY_SCHEME",
                    message,
                    location,
                ));
                continue;
            }
        };

        match resolved {
            SecurityScheme::HTTP { scheme, .. } if scheme.eq_ignore_ascii_case("bearer") => {
                return (
                    Some(AuthConfigDto {
                        r#type: "bearer".to_string(),
                        bearer_token: placeholder_from_name("token"),
                        ..AuthConfigDto::default()
                    }),
                    warnings,
                );
            }
            SecurityScheme::HTTP { scheme, .. } if scheme.eq_ignore_ascii_case("basic") => {
                return (
                    Some(AuthConfigDto {
                        r#type: "basic".to_string(),
                        username: placeholder_from_name("username"),
                        password: placeholder_from_name("password"),
                        ..AuthConfigDto::default()
                    }),
                    warnings,
                );
            }
            SecurityScheme::APIKey {
                location: APIKeyLocation::Header,
                name,
                ..
            } => {
                return (
                    Some(AuthConfigDto {
                        r#type: "apiKey".to_string(),
                        api_key_key: name,
                        api_key_value: placeholder_from_name("apiKey"),
                        api_key_placement: "header".to_string(),
                        ..AuthConfigDto::default()
                    }),
                    warnings,
                );
            }
            SecurityScheme::APIKey {
                location: APIKeyLocation::Query,
                name,
                ..
            } => {
                return (
                    Some(AuthConfigDto {
                        r#type: "apiKey".to_string(),
                        api_key_key: name,
                        api_key_value: placeholder_from_name("apiKey"),
                        api_key_placement: "query".to_string(),
                        ..AuthConfigDto::default()
                    }),
                    warnings,
                );
            }
            _ => warnings.push(warning_diag(
                "OPENAPI_UNSUPPORTED_SECURITY_SCHEME",
                format!("security scheme `{scheme_name}` is not supported in MVP import"),
                location,
            )),
        }
    }

    (None, warnings)
}

fn map_operation_auth(
    root: &Value,
    api: &OpenAPI,
    operation: &Operation,
    location: &str,
) -> (AuthConfigDto, Vec<ImportDiagnosticDto>) {
    if let Some(requirements) = operation.security.as_ref() {
        if requirements.is_empty() {
            return (AuthConfigDto::default(), Vec::new());
        }

        for requirement in requirements {
            let (auth, warnings) = map_security_requirement(root, api, requirement, location);
            if let Some(auth) = auth {
                return (auth, warnings);
            }
            if !warnings.is_empty() {
                return (AuthConfigDto::default(), warnings);
            }
        }
    }

    if let Some(requirements) = api.security.as_ref() {
        for requirement in requirements {
            let (auth, warnings) = map_security_requirement(root, api, requirement, location);
            if let Some(auth) = auth {
                return (auth, warnings);
            }
            if !warnings.is_empty() {
                return (AuthConfigDto::default(), warnings);
            }
        }
    }

    (AuthConfigDto::default(), Vec::new())
}

fn analyze_operation(
    root: &Value,
    api: &OpenAPI,
    spec_title: &str,
    path: &str,
    method: &str,
    path_item: &PathItem,
    operation: &Operation,
) -> Result<(OpenApiImportCandidateDto, Vec<ImportDiagnosticDto>), ImportDiagnosticDto> {
    let location = render_operation_location(method, path);
    let mut diagnostics = Vec::new();

    let (server_base, server_warnings) =
        select_server_base_url(api, path_item, operation, &location);
    diagnostics.extend(server_warnings);

    let mut params = Vec::new();
    let mut headers = Vec::new();
    let parameters = collect_parameters(root, path_item, operation, &location)?;
    for parameter in parameters {
        match parameter {
            Parameter::Query { parameter_data, .. } => {
                params.push(KeyValueItemDto {
                    key: parameter_data.name.clone(),
                    value: parameter_string_value(root, &parameter_data).map_err(|message| {
                        skipped_diag("OPENAPI_UNRESOLVED_REFERENCE", message, &location)
                    })?,
                    description: parameter_data.description.unwrap_or_default(),
                    enabled: true,
                });
            }
            Parameter::Header { parameter_data, .. } => {
                if ["authorization", "accept", "content-type"]
                    .contains(&parameter_data.name.to_ascii_lowercase().as_str())
                {
                    continue;
                }
                headers.push(KeyValueItemDto {
                    key: parameter_data.name.clone(),
                    value: parameter_string_value(root, &parameter_data).map_err(|message| {
                        skipped_diag("OPENAPI_UNRESOLVED_REFERENCE", message, &location)
                    })?,
                    description: parameter_data.description.unwrap_or_default(),
                    enabled: true,
                });
            }
            Parameter::Path { .. } => {}
            Parameter::Cookie { parameter_data, .. } => diagnostics.push(warning_diag(
                "OPENAPI_UNSUPPORTED_PARAMETER_LOCATION",
                format!(
                    "cookie parameter `{}` is not imported in MVP",
                    parameter_data.name
                ),
                &location,
            )),
        }
    }

    let (auth, auth_warnings) = map_operation_auth(root, api, operation, &location);
    diagnostics.extend(auth_warnings);

    let (
        body,
        body_type,
        body_content_type,
        form_data_fields,
        binary_file_name,
        binary_mime_type,
        body_warnings,
    ) = map_request_body(root, operation, &location)?;
    diagnostics.extend(body_warnings);

    let collection_name =
        render_collection_name(spec_title, operation.tags.first().map(String::as_str));
    let request = RequestPresetDto {
        id: String::new(),
        name: derive_request_name_from_operation(method, path, operation),
        description: operation.description.clone().unwrap_or_default(),
        tags: operation.tags.clone(),
        method: normalize_method(method),
        url: join_server_and_path(server_base, path),
        workspace_id: None,
        collection_id: None,
        collection_name: Some(collection_name.clone()),
        params,
        headers,
        body,
        body_type,
        body_content_type,
        form_data_fields,
        binary_file_name,
        binary_mime_type,
        auth,
        tests: Vec::new(),
        mock: None,
        execution_options: crate::models::RequestExecutionOptionsDto::default(),
    };

    Ok((
        OpenApiImportCandidateDto {
            collection_name,
            request,
        },
        diagnostics,
    ))
}

pub fn analyze_openapi_document(
    workspace_id: &str,
    document: &str,
) -> Result<OpenApiImportAnalysisDto, AppError> {
    if workspace_id.trim().is_empty() {
        return Err(AppError {
            code: "INVALID_WORKSPACE".to_string(),
            message: "workspace id is required for OpenAPI analyze".to_string(),
            details: None,
        });
    }

    let (root, openapi) = parse_openapi_document(document)?;
    let spec_title = openapi.info.title.trim().to_string();
    let spec_title = if spec_title.is_empty() {
        OPENAPI_FALLBACK_COLLECTION_NAME.to_string()
    } else {
        spec_title
    };

    let mut total_operation_count = 0usize;
    let mut skipped_operation_count = 0usize;
    let mut diagnostics = Vec::new();
    let mut candidates = Vec::new();

    for (path, item) in openapi.paths.iter() {
        let path_item = match item {
            ReferenceOr::Item(item) => item,
            ReferenceOr::Reference { reference } => {
                diagnostics.push(skipped_diag(
                    "OPENAPI_EXTERNAL_REFERENCE",
                    format!("path item reference `{reference}` is not supported in MVP import"),
                    path,
                ));
                continue;
            }
        };

        for (method, operation) in path_item.iter() {
            total_operation_count += 1;
            match analyze_operation(
                &root,
                &openapi,
                &spec_title,
                path,
                method,
                path_item,
                operation,
            ) {
                Ok((candidate, operation_diagnostics)) => {
                    diagnostics.extend(operation_diagnostics);
                    candidates.push(candidate);
                }
                Err(diagnostic) => {
                    skipped_operation_count += 1;
                    diagnostics.push(diagnostic);
                }
            }
        }
    }

    if candidates.is_empty() {
        return Err(AppError {
            code: "OPENAPI_NO_IMPORTABLE_OPERATIONS".to_string(),
            message: "OpenAPI analyze found no importable operations".to_string(),
            details: None,
        });
    }

    let mut grouping = BTreeMap::<String, usize>::new();
    for candidate in &candidates {
        *grouping
            .entry(candidate.collection_name.clone())
            .or_default() += 1;
    }

    let warning_diagnostic_count = diagnostics
        .iter()
        .filter(|diagnostic| diagnostic.severity == "warning")
        .count();

    Ok(OpenApiImportAnalysisDto {
        version: OPENAPI_ANALYSIS_VERSION.to_string(),
        workspace_id: workspace_id.to_string(),
        source_kind: OPENAPI_SOURCE_KIND.to_string(),
        summary: OpenApiImportSummaryDto {
            total_operation_count,
            importable_request_count: candidates.len(),
            skipped_operation_count,
            warning_diagnostic_count,
        },
        diagnostics,
        grouping_suggestions: grouping
            .into_iter()
            .map(|(name, request_count)| OpenApiCollectionSuggestionDto {
                name,
                request_count,
            })
            .collect(),
        candidates,
    })
}

pub fn apply_openapi_import(
    db_path: &Path,
    payload: &ImportOpenApiApplyPayloadDto,
) -> Result<OpenApiImportApplyResultDto, AppError> {
    if payload.workspace_id.trim().is_empty() {
        return Err(AppError {
            code: "INVALID_WORKSPACE".to_string(),
            message: "workspace id is required for OpenAPI apply".to_string(),
            details: None,
        });
    }

    if payload.analysis.version != OPENAPI_ANALYSIS_VERSION {
        return Err(AppError {
            code: "OPENAPI_UNSUPPORTED_ANALYSIS_VERSION".to_string(),
            message: format!(
                "unsupported OpenAPI analysis version: {}",
                payload.analysis.version
            ),
            details: None,
        });
    }

    if payload.analysis.workspace_id != payload.workspace_id {
        return Err(AppError {
            code: "OPENAPI_WORKSPACE_MISMATCH".to_string(),
            message: "OpenAPI apply requires a matching workspace id".to_string(),
            details: None,
        });
    }

    let mut collections = db::list_collections(db_path, &payload.workspace_id)?;
    let mut collection_ids = BTreeMap::<String, String>::new();
    for collection in &collections {
        collection_ids.insert(collection.name.clone(), collection.id.clone());
    }

    let mut imported_request_count = 0usize;
    let mut touched_collection_names = BTreeSet::new();

    for candidate in &payload.analysis.candidates {
        let collection_id =
            if let Some(existing_id) = collection_ids.get(&candidate.collection_name) {
                existing_id.clone()
            } else {
                let created = db::create_collection(
                    db_path,
                    &CreateCollectionPayloadDto {
                        workspace_id: payload.workspace_id.clone(),
                        name: candidate.collection_name.clone(),
                    },
                )?;
                collections.push(created.clone());
                collection_ids.insert(created.name.clone(), created.id.clone());
                created.id
            };

        let mut request = candidate.request.clone();
        request.id = String::new();
        request.workspace_id = Some(payload.workspace_id.clone());
        request.collection_id = Some(collection_id.clone());
        request.collection_name = Some(candidate.collection_name.clone());

        db::save_request(
            db_path,
            &SaveRequestPayloadDto {
                workspace_id: payload.workspace_id.clone(),
                collection_id,
                request,
            },
        )?;

        imported_request_count += 1;
        touched_collection_names.insert(candidate.collection_name.clone());
    }

    Ok(OpenApiImportApplyResultDto {
        imported_request_count,
        skipped_operation_count: payload.analysis.summary.skipped_operation_count,
        warning_diagnostic_count: payload
            .analysis
            .diagnostics
            .iter()
            .filter(|diagnostic| diagnostic.severity == "warning")
            .count(),
        collection_names: touched_collection_names.into_iter().collect(),
    })
}

pub fn parse_curl_command(command: &str) -> Result<ImportPlan, AppError> {
    let tokens = tokenize_shell_command(command)?;
    if tokens.is_empty() || tokens[0] != "curl" {
        return Err(error(
            "INVALID_CURL_COMMAND",
            "curl import requires a command starting with curl",
        ));
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

        let consume_next =
            |index: &mut usize, tokens: &[String], option_name: &str| -> Result<String, AppError> {
                *index += 1;
                tokens.get(*index).cloned().ok_or_else(|| {
                    error(
                        "INVALID_CURL_COMMAND",
                        format!("missing value for {option_name}"),
                    )
                })
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
            "-L" | "--location" | "-k" | "--insecure" | "-s" | "--silent" | "--compressed"
            | "-i" | "--include" => {}
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
    let url =
        url.ok_or_else(|| error("INVALID_CURL_COMMAND", "curl import requires a target URL"))?;
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

fn body_to_tab_fields(
    body: &RequestBodyDto,
) -> (
    String,
    String,
    Option<String>,
    Vec<FormDataFieldDto>,
    Option<String>,
    Option<String>,
) {
    match body {
        RequestBodyDto::Json { value } => (
            value.clone(),
            "json".to_string(),
            None,
            Vec::new(),
            None,
            None,
        ),
        RequestBodyDto::Raw {
            value,
            content_type,
        } => (
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
        return Err(error(
            "INVALID_IMPORT_PLAN",
            "curl import produced an unexpected import plan",
        ));
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
        execution_options: crate::models::RequestExecutionOptionsDto::default(),
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
    use std::fs;
    use std::path::PathBuf;

    use super::{
        analyze_openapi_document, apply_openapi_import, import_curl_to_draft, parse_curl_command,
    };
    use crate::models::{
        CreateWorkspacePayloadDto, ImportOpenApiApplyPayloadDto, OpenApiImportAnalysisDto,
        RequestBodyDto,
    };
    use crate::storage::db;

    fn temp_db_path(label: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        std::env::temp_dir().join(format!("zenrequest-openapi-{label}-{nanos}.sqlite3"))
    }

    fn fixture_path(name: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("openapi")
            .join(name)
    }

    fn read_fixture(name: &str) -> String {
        fs::read_to_string(fixture_path(name)).expect("fixture should load")
    }

    fn analyze_fixture(workspace_id: &str, name: &str) -> OpenApiImportAnalysisDto {
        analyze_openapi_document(workspace_id, &read_fixture(name)).expect("fixture should analyze")
    }

    fn create_workspace_for_fixture(label: &str) -> (PathBuf, String) {
        let db_path = temp_db_path(label);
        db::initialize_database(&db_path).expect("database initialized");
        let workspace = db::create_workspace(
            &db_path,
            &CreateWorkspacePayloadDto {
                name: format!("OpenAPI Fixture {label}"),
            },
        )
        .expect("workspace created");
        (db_path, workspace.id)
    }

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

        assert_eq!(
            draft.origin.as_ref().map(|origin| origin.kind.as_str()),
            Some("scratch")
        );
        assert_eq!(draft.persistence_state.as_deref(), Some("unsaved"));
        assert_eq!(draft.body_type, "formdata");
        assert_eq!(draft.form_data_fields.len(), 1);
        assert_eq!(
            draft.form_data_fields[0].file_name.as_deref(),
            Some("demo.txt")
        );
        assert_eq!(
            draft.form_data_fields[0].mime_type.as_deref(),
            Some("text/plain")
        );
    }

    #[test]
    fn fixture_corpus_preserves_json_yaml_parity_and_basic_mapping() {
        let json_analysis = analyze_fixture("workspace-1", "parity.json");
        let yaml_analysis = analyze_fixture("workspace-1", "parity.yaml");

        assert_eq!(
            serde_json::to_value(&json_analysis).expect("json analysis serializes"),
            serde_json::to_value(&yaml_analysis).expect("yaml analysis serializes"),
        );

        assert_eq!(json_analysis.workspace_id, "workspace-1");
        assert_eq!(json_analysis.version, "1");
        assert_eq!(json_analysis.summary.total_operation_count, 1);
        assert_eq!(json_analysis.summary.importable_request_count, 1);
        assert_eq!(json_analysis.summary.skipped_operation_count, 0);
        assert_eq!(json_analysis.summary.warning_diagnostic_count, 0);
        assert_eq!(json_analysis.candidates.len(), 1);
        assert_eq!(
            json_analysis.candidates[0].collection_name,
            "Petstore - Pets"
        );
        assert_eq!(json_analysis.candidates[0].request.name, "Get pet");
        assert_eq!(json_analysis.candidates[0].request.method, "GET");
        assert_eq!(
            json_analysis.candidates[0].request.url,
            "https://api.example.com/pets/{{petId}}"
        );
        assert_eq!(json_analysis.candidates[0].request.params.len(), 1);
        assert_eq!(
            json_analysis.candidates[0].request.params[0].key,
            "includeVaccines"
        );
        assert_eq!(json_analysis.candidates[0].request.params[0].value, "true");
    }

    #[test]
    fn fixture_corpus_rejects_invalid_input_before_analysis() {
        let error = analyze_openapi_document("workspace-1", &read_fixture("invalid-source.txt"))
            .expect_err("invalid document should fail");

        assert_eq!(error.code, "OPENAPI_PARSE_ERROR");
    }

    #[test]
    fn fixture_corpus_resolves_in_document_refs() {
        let analysis = analyze_fixture("workspace-1", "internal-refs.json");

        assert_eq!(analysis.summary.total_operation_count, 2);
        assert_eq!(analysis.summary.importable_request_count, 2);
        assert_eq!(analysis.summary.skipped_operation_count, 0);
        assert_eq!(analysis.summary.warning_diagnostic_count, 0);
        assert!(analysis.diagnostics.is_empty());

        let get_request = analysis
            .candidates
            .iter()
            .find(|candidate| candidate.request.method == "GET")
            .expect("GET candidate");
        assert_eq!(get_request.collection_name, "Reference Pets - Pets");
        assert_eq!(
            get_request.request.url,
            "https://api.example.com/pets/{{petId}}"
        );
        assert_eq!(get_request.request.params.len(), 1);
        assert_eq!(get_request.request.params[0].key, "search");
        assert_eq!(get_request.request.params[0].value, "cats");
        assert_eq!(get_request.request.headers.len(), 1);
        assert_eq!(get_request.request.headers[0].key, "traceId");
        assert_eq!(get_request.request.headers[0].value, "trace-123");
        assert_eq!(get_request.request.auth.r#type, "basic");

        let post_request = analysis
            .candidates
            .iter()
            .find(|candidate| candidate.request.method == "POST")
            .expect("POST candidate");
        assert_eq!(post_request.request.body_type, "json");
        assert_eq!(post_request.request.body, "{\"name\":\"Fido\"}");
    }

    #[test]
    fn fixture_corpus_preserves_partial_imports_when_supported_operations_remain() {
        let analysis = analyze_fixture("workspace-1", "partial-import.json");

        assert_eq!(analysis.summary.total_operation_count, 3);
        assert_eq!(analysis.summary.importable_request_count, 1);
        assert_eq!(analysis.summary.skipped_operation_count, 2);
        assert!(analysis
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == "OPENAPI_EXTERNAL_REFERENCE"));
        assert!(analysis
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == "OPENAPI_UNRESOLVED_REFERENCE"));
        assert_eq!(analysis.candidates.len(), 1);
        assert_eq!(analysis.candidates[0].request.name, "List pets");
    }

    #[test]
    fn fixture_corpus_applies_grouping_fallbacks_and_deterministic_mapping_rules() {
        let analysis = analyze_fixture("workspace-1", "fallback-determinism.json");

        assert_eq!(analysis.summary.total_operation_count, 2);
        assert_eq!(analysis.summary.importable_request_count, 2);
        assert_eq!(analysis.summary.skipped_operation_count, 0);
        assert_eq!(analysis.summary.warning_diagnostic_count, 2);
        assert_eq!(analysis.grouping_suggestions.len(), 1);
        assert_eq!(analysis.grouping_suggestions[0].name, "Imported OpenAPI");
        assert_eq!(analysis.grouping_suggestions[0].request_count, 2);
        assert_eq!(
            analysis
                .diagnostics
                .iter()
                .filter(|diagnostic| diagnostic.code == "OPENAPI_UNRESOLVED_SERVER_VARIABLE")
                .count(),
            2
        );

        let report_request = analysis
            .candidates
            .iter()
            .find(|candidate| candidate.request.method == "POST")
            .expect("POST candidate");
        assert_eq!(report_request.collection_name, "Imported OpenAPI");
        assert_eq!(report_request.request.name, "createReport");
        assert_eq!(
            report_request.request.url,
            "https://us-east.example.com/{{stage}}/reports"
        );
        assert_eq!(report_request.request.auth.r#type, "apiKey");
        assert_eq!(report_request.request.auth.api_key_key, "api_key");
        assert_eq!(report_request.request.auth.api_key_placement, "query");
        assert_eq!(report_request.request.body_type, "json");
        assert_eq!(report_request.request.body, "{\"name\":\"Quarterly\"}");

        let health_request = analysis
            .candidates
            .iter()
            .find(|candidate| candidate.request.method == "GET")
            .expect("GET candidate");
        assert_eq!(health_request.collection_name, "Imported OpenAPI");
        assert_eq!(health_request.request.name, "GET /health");
    }

    #[test]
    fn fixture_corpus_apply_stays_append_only_and_preserves_summary_counts() {
        let (db_path, workspace_id) = create_workspace_for_fixture("append-only");
        let analysis = analyze_fixture(&workspace_id, "fallback-determinism.json");

        let payload = ImportOpenApiApplyPayloadDto {
            workspace_id: workspace_id.clone(),
            analysis: analysis.clone(),
        };

        let first_result = apply_openapi_import(&db_path, &payload).expect("first apply");
        let second_result = apply_openapi_import(&db_path, &payload).expect("second apply");

        assert_eq!(
            first_result.imported_request_count,
            analysis.summary.importable_request_count
        );
        assert_eq!(
            first_result.skipped_operation_count,
            analysis.summary.skipped_operation_count
        );
        assert_eq!(
            first_result.warning_diagnostic_count,
            analysis.summary.warning_diagnostic_count
        );
        assert_eq!(
            first_result.collection_names,
            vec!["Imported OpenAPI".to_string()]
        );
        assert_eq!(
            second_result.imported_request_count,
            first_result.imported_request_count
        );
        assert_eq!(
            second_result.warning_diagnostic_count,
            first_result.warning_diagnostic_count
        );

        let collections =
            db::list_collections(&db_path, &workspace_id).expect("collections listed");
        assert_eq!(collections.len(), 1);
        assert_eq!(collections[0].name, "Imported OpenAPI");
        assert_eq!(collections[0].requests.len(), 4);

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn fixture_corpus_rejects_snapshot_workspace_and_version_mismatch() {
        let db_path = temp_db_path("mismatch");
        let analysis = analyze_fixture("workspace-1", "parity.json");

        let error = apply_openapi_import(
            &db_path,
            &ImportOpenApiApplyPayloadDto {
                workspace_id: "workspace-2".to_string(),
                analysis: analysis.clone(),
            },
        )
        .expect_err("workspace mismatch");

        assert_eq!(error.code, "OPENAPI_WORKSPACE_MISMATCH");

        let mut unsupported_analysis = analysis;
        unsupported_analysis.version = "999".to_string();
        let version_error = apply_openapi_import(
            &db_path,
            &ImportOpenApiApplyPayloadDto {
                workspace_id: "workspace-1".to_string(),
                analysis: unsupported_analysis,
            },
        )
        .expect_err("version mismatch");

        assert_eq!(version_error.code, "OPENAPI_UNSUPPORTED_ANALYSIS_VERSION");

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn fixture_corpus_rejects_backup_packages_at_the_openapi_boundary() {
        let error = analyze_openapi_document("workspace-1", &read_fixture("backup-package.json"))
            .expect_err("workspace backup package should not analyze as OpenAPI");

        assert_eq!(error.code, "OPENAPI_PARSE_ERROR");
    }

    #[test]
    fn fixture_corpus_reports_no_importable_operations_when_only_skipped_ops_remain() {
        let error = analyze_openapi_document("workspace-1", &read_fixture("partial-refs.json"))
            .expect_err("all-skipped fixture should fail analyze");

        assert_eq!(error.code, "OPENAPI_NO_IMPORTABLE_OPERATIONS");
    }
}
