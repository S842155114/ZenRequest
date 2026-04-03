use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::errors::AppError;

pub(crate) fn now_epoch_ms() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => i64::try_from(duration.as_millis()).unwrap_or(i64::MAX),
        Err(_) => 0,
    }
}

pub(crate) fn db_error(message: impl Into<String>, details: Option<String>) -> AppError {
    AppError {
        code: "DB_ERROR".to_string(),
        message: message.into(),
        details,
    }
}

pub(crate) fn open_connection(db_path: &Path) -> Result<Connection, AppError> {
    let connection = Connection::open(db_path).map_err(|err| {
        db_error(
            "failed to open sqlite database",
            Some(format!("{} ({})", db_path.display(), err)),
        )
    })?;
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|err| db_error("failed to enable foreign keys", Some(err.to_string())))?;
    Ok(connection)
}

pub(crate) fn serialize_json<T: serde::Serialize>(
    value: &T,
    label: &str,
) -> Result<String, AppError> {
    serde_json::to_string(value).map_err(|err| {
        db_error(
            format!("failed to serialize {label} payload"),
            Some(err.to_string()),
        )
    })
}

pub(crate) fn deserialize_json<T: serde::de::DeserializeOwned>(
    value: &str,
    label: &str,
) -> Result<T, AppError> {
    serde_json::from_str(value).map_err(|err| {
        db_error(
            format!("failed to parse {label} payload"),
            Some(err.to_string()),
        )
    })
}

pub(crate) fn generate_id(prefix: &str) -> String {
    format!("{prefix}-{}", Uuid::new_v4())
}

pub(crate) fn next_sort_order(
    connection: &Connection,
    table: &str,
    foreign_key: &str,
    foreign_value: &str,
) -> Result<i64, AppError> {
    let sql =
        format!("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM {table} WHERE {foreign_key} = ?1");
    connection
        .query_row(sql.as_str(), params![foreign_value], |row| row.get(0))
        .map_err(|err| db_error("failed to compute sort order", Some(err.to_string())))
}

pub(crate) fn touch_workspace(connection: &Connection, workspace_id: &str) -> Result<(), AppError> {
    connection
        .execute(
            "UPDATE workspaces SET updated_at_epoch_ms = ?1 WHERE id = ?2",
            params![now_epoch_ms(), workspace_id],
        )
        .map_err(|err| {
            db_error(
                "failed to update workspace timestamp",
                Some(err.to_string()),
            )
        })?;
    Ok(())
}
