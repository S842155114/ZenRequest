use chrono::{Local, TimeZone};
use rusqlite::{params, Connection, Row};
use std::path::Path;

use crate::errors::AppError;
use crate::models::{
    HistoryItemDto, HistoryStoredPayloadDto, RemoveHistoryItemPayloadDto,
    WorkspaceHistoryExportItemDto,
};
use crate::models::app::{
    McpHistorySummaryDto, ReplayExplainabilityDto, ReplayLimitationDto, ReplaySourceNoteDto,
};
use crate::storage::connection::{
    db_error, deserialize_json, generate_id, open_connection, serialize_json, touch_workspace,
};

pub fn list_history(db_path: &Path, workspace_id: &str) -> Result<Vec<HistoryItemDto>, AppError> {
    let connection = open_connection(db_path)?;
    load_history_with_connection(&connection, workspace_id)
}

pub fn clear_history(
    db_path: &Path,
    payload: &crate::models::HistoryQueryPayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM history_items WHERE workspace_id = ?1",
            params![payload.workspace_id],
        )
        .map_err(|err| db_error("failed to clear history", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub fn remove_history_item(
    db_path: &Path,
    payload: &RemoveHistoryItemPayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM history_items WHERE workspace_id = ?1 AND id = ?2",
            params![payload.workspace_id, payload.id],
        )
        .map_err(|err| db_error("failed to remove history item", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub fn insert_history_item(
    db_path: &Path,
    workspace_id: &str,
    payload: &HistoryStoredPayloadDto,
) -> Result<HistoryItemDto, AppError> {
    let connection = open_connection(db_path)?;
    let history = insert_history_item_in_connection(&connection, workspace_id, payload)?;
    touch_workspace(&connection, workspace_id)?;
    Ok(history)
}

pub(crate) fn load_history_item_with_connection(
    connection: &Connection,
    history_id: &str,
) -> Result<HistoryItemDto, AppError> {
    connection
        .query_row(
            "SELECT id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, execution_source, executed_at_epoch_ms
             FROM history_items
             WHERE id = ?1",
            params![history_id],
            map_history_row,
        )
        .map_err(|err| db_error("failed to load history item", Some(err.to_string())))
}

pub(crate) fn load_history_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<HistoryItemDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, execution_source, executed_at_epoch_ms
             FROM history_items
             WHERE workspace_id = ?1
             ORDER BY executed_at_epoch_ms DESC",
        )
        .map_err(|err| db_error("failed to prepare history query", Some(err.to_string())))?;

    let rows = statement
        .query_map(params![workspace_id], map_history_row)
        .map_err(|err| db_error("failed to query history", Some(err.to_string())))?;

    let mut history = Vec::new();
    for row in rows {
        history
            .push(row.map_err(|err| db_error("failed to map history row", Some(err.to_string())))?);
    }
    Ok(history)
}

pub(crate) fn load_history_export_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<WorkspaceHistoryExportItemDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, execution_source, executed_at_epoch_ms
             FROM history_items
             WHERE workspace_id = ?1
             ORDER BY executed_at_epoch_ms DESC",
        )
        .map_err(|err| db_error("failed to prepare history export query", Some(err.to_string())))?;

    let rows = statement
        .query_map(params![workspace_id], |row| {
            let request_snapshot_json: String = row.get(5)?;
            let response_headers_json: String = row.get(11)?;
            let executed_at_epoch_ms: i64 = row.get(15)?;

            Ok(WorkspaceHistoryExportItemDto {
                id: row.get(0)?,
                request_id: row.get(1)?,
                request_name: row.get(2)?,
                request_method: row.get(3)?,
                request_url: row.get(4)?,
                request_snapshot: deserialize_json(&request_snapshot_json, "history request snapshot")
                    .map_err(|err| rusqlite::Error::FromSqlConversionFailure(5, rusqlite::types::Type::Text, Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, err.message))))?,
                status: row.get(6)?,
                status_text: row.get(7)?,
                elapsed_ms: row.get::<_, i64>(8)? as u64,
                size_bytes: row.get::<_, i64>(9)? as usize,
                content_type: row.get(10)?,
                response_headers: deserialize_json(&response_headers_json, "history response headers")
                    .map_err(|err| rusqlite::Error::FromSqlConversionFailure(11, rusqlite::types::Type::Text, Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, err.message))))?,
                response_preview: row.get(12)?,
                truncated: row.get::<_, i64>(13)? != 0,
                execution_source: row.get(14)?,
                executed_at_epoch_ms: executed_at_epoch_ms as u64,
            })
        })
        .map_err(|err| db_error("failed to query history export", Some(err.to_string())))?;

    let mut history = Vec::new();
    for row in rows {
        history.push(
            row.map_err(|err| db_error("failed to map history export row", Some(err.to_string())))?,
        );
    }
    Ok(history)
}

pub(crate) fn insert_history_item_in_connection(
    connection: &Connection,
    workspace_id: &str,
    payload: &HistoryStoredPayloadDto,
) -> Result<HistoryItemDto, AppError> {
    let history_id = generate_id("history");
    let request_snapshot_json =
        serialize_json(&payload.request_snapshot, "history request snapshot")?;
    let headers_json = serialize_json(&payload.response_headers, "history response headers")?;

    connection
        .execute(
            "INSERT INTO history_items
             (id, workspace_id, request_id, request_name, request_method, request_url, request_snapshot_json, status, status_text, elapsed_ms, size_bytes, content_type, response_headers_json, response_preview, truncated, execution_source, executed_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                history_id,
                workspace_id,
                payload.request_id,
                payload.request_name,
                payload.request_method,
                payload.request_url,
                request_snapshot_json,
                payload.status,
                payload.status_text,
                i64::try_from(payload.elapsed_ms).unwrap_or(i64::MAX),
                i64::try_from(payload.size_bytes).unwrap_or(i64::MAX),
                payload.content_type,
                headers_json,
                payload.response_preview,
                if payload.truncated { 1 } else { 0 },
                payload.execution_source,
                i64::try_from(payload.executed_at_epoch_ms).unwrap_or(i64::MAX)
            ],
        )
        .map_err(|err| db_error("failed to insert history item", Some(err.to_string())))?;
    load_history_item_with_connection(connection, &history_id)
}

const REDACTED_SECRET_VALUE: &str = "[REDACTED]";

fn contains_template_marker(value: &str) -> bool {
    value.contains("{{") && value.contains("}}")
}

fn is_redacted_value(value: &str) -> bool {
    value.trim() == REDACTED_SECRET_VALUE
}

fn has_safe_projected_fields(snapshot: &crate::models::SendRequestPayloadDto) -> bool {
    snapshot.headers.iter().any(|item| is_redacted_value(&item.value))
        || snapshot.params.iter().any(|item| is_redacted_value(&item.value))
        || is_redacted_value(&snapshot.auth.bearer_token)
        || is_redacted_value(&snapshot.auth.username)
        || is_redacted_value(&snapshot.auth.password)
        || is_redacted_value(&snapshot.auth.api_key_value)
}

fn has_template_sources(snapshot: &crate::models::SendRequestPayloadDto) -> bool {
    contains_template_marker(&snapshot.url)
        || snapshot.headers.iter().any(|item| contains_template_marker(&item.value))
        || snapshot.params.iter().any(|item| contains_template_marker(&item.value))
        || contains_template_marker(&snapshot.auth.bearer_token)
        || contains_template_marker(&snapshot.auth.username)
        || contains_template_marker(&snapshot.auth.password)
        || contains_template_marker(&snapshot.auth.api_key_value)
}

fn create_replay_explainability_summary(
    sources: &[ReplaySourceNoteDto],
    limitations: &[ReplayLimitationDto],
) -> String {
    let source_labels = sources
        .iter()
        .map(|source| source.label.as_str())
        .collect::<Vec<_>>()
        .join(" + ");
    if limitations.is_empty() {
        format!("Replay is based on {source_labels}.")
    } else {
        format!(
            "Replay is based on {source_labels}, but cannot fully reproduce the original execution."
        )
    }
}

pub(crate) fn derive_replay_explainability(
    snapshot: &crate::models::SendRequestPayloadDto,
) -> Option<ReplayExplainabilityDto> {
    if snapshot.request_kind.as_deref() == Some("mcp") {
        return None;
    }

    let mut sources = vec![ReplaySourceNoteDto {
        category: "authored".to_string(),
        label: "Authored request".to_string(),
        detail: Some("Replay starts from the persisted history request snapshot.".to_string()),
    }];
    let mut limitations = Vec::new();

    if has_template_sources(snapshot) {
        sources.push(ReplaySourceNoteDto {
            category: "template".to_string(),
            label: "Template markers".to_string(),
            detail: Some(
                "Saved history still contains template placeholders that must be resolved again during replay."
                    .to_string(),
            ),
        });
    }

    if has_safe_projected_fields(snapshot) {
        sources.push(ReplaySourceNoteDto {
            category: "safe-projected".to_string(),
            label: "Safe-projected secrets".to_string(),
            detail: Some(
                "Persisted history redacts sensitive values, so replay can only use their safe projection."
                    .to_string(),
            ),
        });
        limitations.push(ReplayLimitationDto {
            code: "safe_projection_loss".to_string(),
            label: "Sensitive values were redacted".to_string(),
            detail: Some(
                "Replay cannot recover secret headers, params, or auth fields that were stored as [REDACTED]."
                    .to_string(),
            ),
        });
    }

    Some(ReplayExplainabilityDto {
        summary: create_replay_explainability_summary(&sources, &limitations),
        sources,
        limitations,
    })
}

fn derive_mcp_error_category(
    operation: &str,
    status: u16,
    response_preview: &str,
) -> Option<String> {
    if status >= 400 {
        return Some("transport".to_string());
    }

    let response = serde_json::from_str::<serde_json::Value>(response_preview).ok()?;
    let error = response.get("error")?;
    if !error.is_object() {
        return None;
    }

    if operation == "initialize" {
        return Some("initialize".to_string());
    }

    Some("protocol".to_string())
}

fn derive_mcp_history_summary(
    snapshot: &Option<crate::models::SendRequestPayloadDto>,
    status: u16,
    response_preview: &str,
) -> Option<McpHistorySummaryDto> {
    let snapshot = snapshot.as_ref()?;
    if snapshot.request_kind.as_deref() != Some("mcp") {
        return None;
    }

    let mcp = snapshot.mcp.as_ref()?;
    let operation = match &mcp.operation {
        crate::models::request::McpOperationInputDto::Initialize { .. } => "initialize".to_string(),
        crate::models::request::McpOperationInputDto::ToolsList { .. } => "tools.list".to_string(),
        crate::models::request::McpOperationInputDto::ToolsCall { .. } => "tools.call".to_string(),
        crate::models::request::McpOperationInputDto::ResourcesList { .. } => "resources.list".to_string(),
        crate::models::request::McpOperationInputDto::ResourcesRead { .. } => "resources.read".to_string(),
        crate::models::request::McpOperationInputDto::PromptsList { .. } => "prompts.list".to_string(),
        crate::models::request::McpOperationInputDto::PromptsGet { .. } => "prompts.get".to_string(),
        crate::models::request::McpOperationInputDto::Sampling { .. } => "sampling".to_string(),
    };
    let error_category = derive_mcp_error_category(&operation, status, response_preview);

    Some(McpHistorySummaryDto {
        operation,
        transport: mcp.connection.transport.clone(),
        error_category,
    })
}

fn map_history_row(row: &Row<'_>) -> rusqlite::Result<HistoryItemDto> {
    let request_snapshot_json: String = row.get(5)?;
    let response_headers_json: String = row.get(11)?;
    let response_preview: String = row.get(12)?;
    let status: u16 = row.get(6)?;
    let executed_at_epoch_ms: i64 = row.get(15)?;
    let request_snapshot: crate::models::SendRequestPayloadDto = deserialize_json(&request_snapshot_json, "history request snapshot")
        .map_err(|err| rusqlite::Error::FromSqlConversionFailure(5, rusqlite::types::Type::Text, Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, err.message))))?;
    let mcp_summary = derive_mcp_history_summary(&Some(request_snapshot.clone()), status, &response_preview);
    let explainability = derive_replay_explainability(&request_snapshot);
    Ok(HistoryItemDto {
        id: row.get(0)?,
        request_id: row.get(1)?,
        name: row.get(2)?,
        method: row.get(3)?,
        url: row.get(4)?,
        request_snapshot: Some(request_snapshot),
        status,
        status_text: row.get(7)?,
        elapsed_ms: row.get::<_, i64>(8)? as u64,
        size_bytes: row.get::<_, i64>(9)? as usize,
        content_type: row.get(10)?,
        response_headers: deserialize_json(&response_headers_json, "history response headers")
            .map_err(|err| rusqlite::Error::FromSqlConversionFailure(11, rusqlite::types::Type::Text, Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, err.message))))?,
        response_preview,
        truncated: row.get::<_, i64>(13)? != 0,
        execution_source: row.get(14)?,
        mcp_summary,
        explainability,
        executed_at_epoch_ms: executed_at_epoch_ms as u64,
        time: format_history_time(executed_at_epoch_ms),
    })
}

fn format_history_time(epoch_ms: i64) -> String {
    let local = Local.timestamp_millis_opt(epoch_ms).single();
    match local {
        Some(value) => value.format("%H:%M:%S").to_string(),
        None => "00:00:00".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::{clear_history, insert_history_item, list_history};
    use crate::models::request::{
        McpConnectionConfigDto, McpInitializeInputDto, McpOperationInputDto, McpRequestDefinitionDto,
        McpToolCallInputDto, RequestBodyDto, RequestExecutionOptionsDto, RequestMockStateDto,
    };
    use crate::models::{HistoryQueryPayloadDto, HistoryStoredPayloadDto, SendRequestPayloadDto};
    use crate::storage::db::initialize_database;
    use crate::storage::repositories::workspace_repo::ensure_bootstrap_data;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_db_path(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default();
        std::env::temp_dir().join(format!("zenrequest-{name}-{suffix}.sqlite3"))
    }


    #[test]
    fn history_repo_derives_http_replay_explainability_from_snapshot() {
        let db_path = temp_db_path("history-http-explainability");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");

        let persisted = insert_history_item(
            &db_path,
            &workspace_id,
            &HistoryStoredPayloadDto {
                request_id: None,
                request_name: "Explainable Orders".to_string(),
                request_method: "GET".to_string(),
                request_url: "https://example.com/orders/{{orderId}}".to_string(),
                request_snapshot: SendRequestPayloadDto {
                    workspace_id: workspace_id.clone(),
                    request_kind: None,
                    mcp: None,
                    active_environment_id: None,
                    tab_id: "tab-http-explainability".to_string(),
                    request_id: None,
                    name: "Explainable Orders".to_string(),
                    description: String::new(),
                    tags: Vec::new(),
                    collection_name: "Scratch Pad".to_string(),
                    method: "GET".to_string(),
                    url: "https://example.com/orders/{{orderId}}".to_string(),
                    params: vec![crate::models::KeyValueItemDto {
                        key: "token".to_string(),
                        value: "[REDACTED]".to_string(),
                        description: String::new(),
                        enabled: true,
                    }],
                    headers: vec![crate::models::KeyValueItemDto {
                        key: "Authorization".to_string(),
                        value: "[REDACTED]".to_string(),
                        description: String::new(),
                        enabled: true,
                    }],
                    body: RequestBodyDto::Json { value: "{}".to_string() },
                    auth: crate::models::AuthConfigDto {
                        r#type: "bearer".to_string(),
                        bearer_token: "[REDACTED]".to_string(),
                        ..Default::default()
                    },
                    tests: Vec::new(),
                    mock: None,
                    execution_options: RequestExecutionOptionsDto::default(),
                },
                status: 200,
                status_text: "OK".to_string(),
                elapsed_ms: 8,
                size_bytes: 64,
                content_type: "application/json".to_string(),
                response_headers: Vec::new(),
                response_preview: "{}".to_string(),
                truncated: false,
                execution_source: "live".to_string(),
                executed_at_epoch_ms: 1_775_100_000_000,
            },
        )
        .expect("history inserted");

        let explainability = persisted.explainability.expect("explainability");
        assert!(explainability
            .sources
            .iter()
            .any(|source| source.category == "authored"));
        assert!(explainability
            .sources
            .iter()
            .any(|source| source.category == "template"));
        assert!(explainability
            .sources
            .iter()
            .any(|source| source.category == "safe-projected"));
        assert!(explainability
            .limitations
            .iter()
            .any(|limitation| limitation.code == "safe_projection_loss"));

        let history = list_history(&db_path, &workspace_id).expect("history listed");
        let item = history.first().expect("history item");
        let explainability = item.explainability.as_ref().expect("history explainability");
        assert!(explainability.summary.contains("cannot fully reproduce"));

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn history_repo_derives_mcp_summary_from_request_snapshot() {
        let db_path = temp_db_path("history-mcp-summary");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");

        let persisted = insert_history_item(
            &db_path,
            &workspace_id,
            &HistoryStoredPayloadDto {
                request_id: None,
                request_name: "MCP Search".to_string(),
                request_method: "POST".to_string(),
                request_url: "https://example.com/mcp".to_string(),
                request_snapshot: SendRequestPayloadDto {
                    workspace_id: workspace_id.clone(),
                    request_kind: Some("mcp".to_string()),
                    mcp: Some(crate::models::request::McpRequestDefinitionDto {
                        connection: crate::models::request::McpConnectionConfigDto {
                            transport: "http".to_string(),
                            base_url: "https://example.com/mcp".to_string(),
                            headers: Vec::new(),
                            auth: Default::default(),
                            session_id: None,
                            stdio: None,
                        },
                        operation: crate::models::request::McpOperationInputDto::ToolsCall {
                            input: crate::models::request::McpToolCallInputDto {
                                tool_name: "search".to_string(),
                                arguments: serde_json::json!({ "q": "zen" }),
                                schema: None,
                            },
                        },
                        roots: None,
                    }),
                    active_environment_id: None,
                    tab_id: "tab-mcp".to_string(),
                    request_id: None,
                    name: "MCP Search".to_string(),
                    description: String::new(),
                    tags: vec!["mcp".to_string()],
                    collection_name: "Scratch Pad".to_string(),
                    method: "POST".to_string(),
                    url: "https://example.com/mcp".to_string(),
                    params: Vec::new(),
                    headers: Vec::new(),
                    body: RequestBodyDto::Json { value: String::new() },
                    auth: Default::default(),
                    tests: Vec::new(),
                    mock: None,
                    execution_options: RequestExecutionOptionsDto::default(),
                },
                status: 200,
                status_text: "OK".to_string(),
                elapsed_ms: 12,
                size_bytes: 24,
                content_type: "application/json".to_string(),
                response_headers: Vec::new(),
                response_preview: "{\"result\":true}".to_string(),
                truncated: false,
                execution_source: "live".to_string(),
                executed_at_epoch_ms: 1_775_000_000_000,
            },
        )
        .expect("history inserted");

        let summary = persisted.mcp_summary.expect("mcp summary");
        assert_eq!(summary.operation, "tools.call");
        assert_eq!(summary.transport, "http");
        assert_eq!(summary.error_category, None);
    }

    #[test]
    fn history_repo_derives_transport_error_category_from_status_code() {
        let db_path = temp_db_path("history-mcp-transport-error");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");

        let persisted = insert_history_item(
            &db_path,
            &workspace_id,
            &HistoryStoredPayloadDto {
                request_id: None,
                request_name: "MCP Search Error".to_string(),
                request_method: "POST".to_string(),
                request_url: "https://example.com/mcp".to_string(),
                request_snapshot: SendRequestPayloadDto {
                    workspace_id: workspace_id.clone(),
                    request_kind: Some("mcp".to_string()),
                    mcp: Some(McpRequestDefinitionDto {
                        connection: McpConnectionConfigDto {
                            transport: "http".to_string(),
                            base_url: "https://example.com/mcp".to_string(),
                            headers: Vec::new(),
                            auth: Default::default(),
                            session_id: None,
                            stdio: None,
                        },
                        operation: McpOperationInputDto::ToolsCall {
                            input: McpToolCallInputDto {
                                tool_name: "search".to_string(),
                                arguments: serde_json::json!({ "q": "zen" }),
                                schema: None,
                            },
                        },
                        roots: None,
                    }),
                    active_environment_id: None,
                    tab_id: "tab-mcp-transport-error".to_string(),
                    request_id: None,
                    name: "MCP Search Error".to_string(),
                    description: String::new(),
                    tags: vec!["mcp".to_string()],
                    collection_name: "Scratch Pad".to_string(),
                    method: "POST".to_string(),
                    url: "https://example.com/mcp".to_string(),
                    params: Vec::new(),
                    headers: Vec::new(),
                    body: RequestBodyDto::Json { value: String::new() },
                    auth: Default::default(),
                    tests: Vec::new(),
                    mock: None,
                    execution_options: RequestExecutionOptionsDto::default(),
                },
                status: 502,
                status_text: "Bad Gateway".to_string(),
                elapsed_ms: 12,
                size_bytes: 24,
                content_type: "application/json".to_string(),
                response_headers: Vec::new(),
                response_preview: "{\"error\":{\"code\":-32000,\"message\":\"gateway failed\"}}".to_string(),
                truncated: false,
                execution_source: "live".to_string(),
                executed_at_epoch_ms: 1_775_000_000_100,
            },
        )
        .expect("history inserted");

        let summary = persisted.mcp_summary.expect("mcp summary");
        assert_eq!(summary.operation, "tools.call");
        assert_eq!(summary.error_category.as_deref(), Some("transport"));
    }

    #[test]
    fn history_repo_derives_initialize_error_category_from_protocol_error_payload() {
        let db_path = temp_db_path("history-mcp-initialize-error");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");

        let persisted = insert_history_item(
            &db_path,
            &workspace_id,
            &HistoryStoredPayloadDto {
                request_id: None,
                request_name: "MCP Initialize".to_string(),
                request_method: "POST".to_string(),
                request_url: "https://example.com/mcp".to_string(),
                request_snapshot: SendRequestPayloadDto {
                    workspace_id: workspace_id.clone(),
                    request_kind: Some("mcp".to_string()),
                    mcp: Some(McpRequestDefinitionDto {
                        connection: McpConnectionConfigDto {
                            transport: "http".to_string(),
                            base_url: "https://example.com/mcp".to_string(),
                            headers: Vec::new(),
                            auth: Default::default(),
                            session_id: None,
                            stdio: None,
                        },
                        operation: McpOperationInputDto::Initialize {
                            input: McpInitializeInputDto {
                                client_name: "ZenRequest".to_string(),
                                client_version: "0.1.0".to_string(),
                                protocol_version: None,
                                capabilities: None,
                            },
                        },
                        roots: None,
                    }),
                    active_environment_id: None,
                    tab_id: "tab-mcp-initialize-error".to_string(),
                    request_id: None,
                    name: "MCP Initialize".to_string(),
                    description: String::new(),
                    tags: vec!["mcp".to_string()],
                    collection_name: "Scratch Pad".to_string(),
                    method: "POST".to_string(),
                    url: "https://example.com/mcp".to_string(),
                    params: Vec::new(),
                    headers: Vec::new(),
                    body: RequestBodyDto::Json { value: String::new() },
                    auth: Default::default(),
                    tests: Vec::new(),
                    mock: None,
                    execution_options: RequestExecutionOptionsDto::default(),
                },
                status: 200,
                status_text: "OK".to_string(),
                elapsed_ms: 8,
                size_bytes: 48,
                content_type: "application/json".to_string(),
                response_headers: Vec::new(),
                response_preview: "{\"jsonrpc\":\"2.0\",\"id\":1,\"error\":{\"code\":-32002,\"message\":\"initialize failed\"}}".to_string(),
                truncated: false,
                execution_source: "live".to_string(),
                executed_at_epoch_ms: 1_775_000_000_200,
            },
        )
        .expect("history inserted");

        let summary = persisted.mcp_summary.expect("mcp summary");
        assert_eq!(summary.operation, "initialize");
        assert_eq!(summary.error_category.as_deref(), Some("initialize"));
    }

    #[test]
    fn history_repo_insert_list_and_clear_preserve_execution_source() {
        let db_path = temp_db_path("history-repo");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");
        let request = bootstrap.collections[0].requests[0].clone();
        let environment_id = bootstrap.environments[0].id.clone();

        let persisted = insert_history_item(
            &db_path,
            &workspace_id,
            &HistoryStoredPayloadDto {
                request_id: Some(request.id.clone()),
                request_name: request.name.clone(),
                request_method: request.method.clone(),
                request_url: request.url.clone(),
                request_snapshot: SendRequestPayloadDto {
                    workspace_id: workspace_id.clone(),
                    request_kind: None,
                    mcp: None,
                    active_environment_id: Some(environment_id.clone()),
                    tab_id: "tab-history-binary".to_string(),
                    request_id: Some(request.id.clone()),
                    name: request.name.clone(),
                    description: request.description.clone(),
                    tags: request.tags.clone(),
                    collection_name: request.collection_name.clone().unwrap_or_default(),
                    method: request.method.clone(),
                    url: request.url.clone(),
                    params: request.params.clone(),
                    headers: request.headers.clone(),
                    body: RequestBodyDto::Binary {
                        bytes_base64: "ZmFrZS1ieXRlcw==".to_string(),
                        file_name: Some("payload.bin".to_string()),
                        mime_type: Some("application/octet-stream".to_string()),
                    },
                    auth: request.auth.clone(),
                    tests: request.tests.clone(),
                    mock: Some(RequestMockStateDto {
                        enabled: true,
                        status: 200,
                        status_text: "OK".to_string(),
                        content_type: "application/json".to_string(),
                        body: "{\"source\":\"mock\"}".to_string(),
                        headers: Vec::new(),
                    }),
                    execution_options: RequestExecutionOptionsDto {
                        timeout_ms: Some(5_000),
                        ..Default::default()
                    },
                },
                status: 200,
                status_text: "OK".to_string(),
                elapsed_ms: 3,
                size_bytes: 12,
                content_type: "application/octet-stream".to_string(),
                response_headers: Vec::new(),
                response_preview: "binary-preview".to_string(),
                truncated: false,
                execution_source: "mock".to_string(),
                executed_at_epoch_ms: 1_717_171_717_100,
            },
        )
        .expect("history inserted");

        assert_eq!(persisted.execution_source, "mock");
        match persisted.request_snapshot.expect("request snapshot").body {
            RequestBodyDto::Binary { file_name, .. } => {
                assert_eq!(file_name.as_deref(), Some("payload.bin"));
            }
            other => panic!("unexpected history request body: {other:?}"),
        }

        let history = list_history(&db_path, &workspace_id).expect("history listed");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].execution_source, "mock");
        assert_eq!(
            history[0]
                .request_snapshot
                .as_ref()
                .and_then(|snapshot| snapshot.execution_options.timeout_ms),
            Some(5_000)
        );

        clear_history(
            &db_path,
            &HistoryQueryPayloadDto {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("history cleared");
        assert!(list_history(&db_path, &workspace_id)
            .expect("history reloaded")
            .is_empty());

        let _ = fs::remove_file(db_path);
    }


    #[test]
    fn history_repo_returns_error_for_corrupted_persisted_json_row() {
        let db_path = temp_db_path("history-corrupted");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");

        let persisted = insert_history_item(
            &db_path,
            &workspace_id,
            &HistoryStoredPayloadDto {
                request_id: None,
                request_name: "Orders".to_string(),
                request_method: "GET".to_string(),
                request_url: "https://example.com/orders".to_string(),
                request_snapshot: SendRequestPayloadDto {
                    workspace_id: workspace_id.clone(),
                    request_kind: None,
                    mcp: None,
                    active_environment_id: None,
                    tab_id: "tab-history-corrupted".to_string(),
                    request_id: None,
                    name: "Orders".to_string(),
                    description: String::new(),
                    tags: Vec::new(),
                    collection_name: "Scratch Pad".to_string(),
                    method: "GET".to_string(),
                    url: "https://example.com/orders".to_string(),
                    params: Vec::new(),
                    headers: Vec::new(),
                    body: RequestBodyDto::Json { value: "{}".to_string() },
                    auth: Default::default(),
                    tests: Vec::new(),
                    mock: None,
                    execution_options: RequestExecutionOptionsDto::default(),
                },
                status: 200,
                status_text: "OK".to_string(),
                elapsed_ms: 10,
                size_bytes: 2,
                content_type: "application/json".to_string(),
                response_headers: Vec::new(),
                response_preview: "{}".to_string(),
                truncated: false,
                execution_source: "live".to_string(),
                executed_at_epoch_ms: 1,
            },
        )
        .expect("history inserted");

        let connection = crate::storage::connection::open_connection(&db_path).expect("connection opened");
        connection
            .execute(
                "UPDATE history_items SET request_snapshot_json = ?1 WHERE id = ?2",
                rusqlite::params!["{bad-json", persisted.id],
            )
            .expect("history row corrupted");

        let err = list_history(&db_path, &workspace_id).expect_err("corrupted history row should fail");
        assert!(err.message.contains("failed to map history row") || err.details.unwrap_or_default().contains("history request snapshot"));

        let _ = fs::remove_file(db_path);
    }

}
