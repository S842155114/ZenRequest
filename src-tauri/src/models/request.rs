use serde::{Deserialize, Serialize};

use crate::models::app::HistoryItemDto;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct KeyValueItemDto {
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthConfigDto {
    pub r#type: String,
    pub bearer_token: String,
    pub username: String,
    pub password: String,
    pub api_key_key: String,
    pub api_key_value: String,
    pub api_key_placement: String,
}

impl Default for AuthConfigDto {
    fn default() -> Self {
        Self {
            r#type: "none".to_string(),
            bearer_token: String::new(),
            username: String::new(),
            password: String::new(),
            api_key_key: "X-API-Key".to_string(),
            api_key_value: String::new(),
            api_key_placement: "header".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestTestDefinitionDto {
    pub id: String,
    pub name: String,
    pub source: String,
    pub operator: String,
    #[serde(default)]
    pub target: String,
    #[serde(default)]
    pub expected: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FormDataFieldDto {
    pub key: String,
    #[serde(default)]
    pub value: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RequestBodyDto {
    Json {
        value: String,
    },
    Raw {
        value: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        content_type: Option<String>,
    },
    FormData {
        fields: Vec<FormDataFieldDto>,
    },
    Binary {
        bytes_base64: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        file_name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        mime_type: Option<String>,
    },
}

impl Default for RequestBodyDto {
    fn default() -> Self {
        Self::Json {
            value: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SendRequestPayloadDto {
    pub workspace_id: String,
    pub tab_id: String,
    pub request_id: Option<String>,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub collection_name: String,
    pub method: String,
    pub url: String,
    pub params: Vec<KeyValueItemDto>,
    pub headers: Vec<KeyValueItemDto>,
    pub body: RequestBodyDto,
    pub auth: AuthConfigDto,
    #[serde(default)]
    pub tests: Vec<RequestTestDefinitionDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResponseHeaderItemDto {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendRequestResultDto {
    pub request_method: String,
    pub request_url: String,
    pub status: u16,
    pub status_text: String,
    pub elapsed_ms: u64,
    pub size_bytes: usize,
    pub content_type: String,
    pub response_body: String,
    pub headers: Vec<ResponseHeaderItemDto>,
    pub truncated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub history_item: Option<HistoryItemDto>,
}

impl Default for SendRequestResultDto {
    fn default() -> Self {
        Self {
            request_method: "GET".to_string(),
            request_url: String::new(),
            status: 0,
            status_text: "NOT_IMPLEMENTED".to_string(),
            elapsed_ms: 0,
            size_bytes: 0,
            content_type: "text/plain".to_string(),
            response_body: String::new(),
            headers: Vec::new(),
            truncated: false,
            history_item: None,
        }
    }
}
