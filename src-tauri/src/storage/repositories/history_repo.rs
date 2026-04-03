use chrono::{Local, TimeZone};
use rusqlite::{params, Connection, Row};
use std::path::Path;

use crate::errors::AppError;
use crate::models::{
    HistoryItemDto, HistoryStoredPayloadDto, RemoveHistoryItemPayloadDto,
    WorkspaceHistoryExportItemDto,
};
use crate::storage::connection::{
    db_error, generate_id, open_connection, serialize_json, touch_workspace,
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
                request_snapshot: serde_json::from_str(&request_snapshot_json).unwrap_or_default(),
                status: row.get(6)?,
                status_text: row.get(7)?,
                elapsed_ms: row.get::<_, i64>(8)? as u64,
                size_bytes: row.get::<_, i64>(9)? as usize,
                content_type: row.get(10)?,
                response_headers: serde_json::from_str(&response_headers_json).unwrap_or_default(),
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

fn map_history_row(row: &Row<'_>) -> rusqlite::Result<HistoryItemDto> {
    let request_snapshot_json: String = row.get(5)?;
    let response_headers_json: String = row.get(11)?;
    let executed_at_epoch_ms: i64 = row.get(15)?;
    Ok(HistoryItemDto {
        id: row.get(0)?,
        request_id: row.get(1)?,
        name: row.get(2)?,
        method: row.get(3)?,
        url: row.get(4)?,
        request_snapshot: serde_json::from_str(&request_snapshot_json).ok(),
        status: row.get(6)?,
        status_text: row.get(7)?,
        elapsed_ms: row.get::<_, i64>(8)? as u64,
        size_bytes: row.get::<_, i64>(9)? as usize,
        content_type: row.get(10)?,
        response_headers: serde_json::from_str(&response_headers_json).unwrap_or_default(),
        response_preview: row.get(12)?,
        truncated: row.get::<_, i64>(13)? != 0,
        execution_source: row.get(14)?,
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
    RequestBodyDto, RequestExecutionOptionsDto, RequestMockStateDto,
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
}
