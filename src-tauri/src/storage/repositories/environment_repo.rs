use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

use crate::errors::AppError;
use crate::models::{
    CreateEnvironmentPayloadDto, DeleteEnvironmentPayloadDto, EnvironmentDto,
    RenameEnvironmentPayloadDto, UpdateEnvironmentVariablesPayloadDto,
};
use crate::storage::connection::{
    db_error, generate_id, now_epoch_ms, open_connection, serialize_json, touch_workspace,
};

pub fn list_environments(
    db_path: &Path,
    workspace_id: &str,
) -> Result<Vec<EnvironmentDto>, AppError> {
    let connection = open_connection(db_path)?;
    load_environments_with_connection(&connection, workspace_id)
}

pub fn create_environment(
    db_path: &Path,
    payload: &CreateEnvironmentPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    let connection = open_connection(db_path)?;
    let environment = EnvironmentDto {
        id: generate_id("env"),
        name: payload.name.trim().to_string(),
        variables: Vec::new(),
    };
    let timestamp = now_epoch_ms();
    let variables_json = serialize_json(&environment.variables, "environment variables")?;

    connection
        .execute(
            "INSERT INTO environments (id, workspace_id, name, variables_json, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                environment.id,
                payload.workspace_id,
                environment.name,
                variables_json,
                timestamp,
                timestamp
            ],
        )
        .map_err(|err| db_error("failed to create environment", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(environment)
}

pub fn rename_environment(
    db_path: &Path,
    payload: &RenameEnvironmentPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "UPDATE environments SET name = ?1, updated_at_epoch_ms = ?2 WHERE id = ?3 AND workspace_id = ?4",
            params![
                payload.name.trim(),
                now_epoch_ms(),
                payload.environment_id,
                payload.workspace_id
            ],
        )
        .map_err(|err| db_error("failed to rename environment", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    load_environment_with_connection(&connection, &payload.workspace_id, &payload.environment_id)
}

pub fn update_environment_variables(
    db_path: &Path,
    payload: &UpdateEnvironmentVariablesPayloadDto,
) -> Result<EnvironmentDto, AppError> {
    let connection = open_connection(db_path)?;
    let variables_json = serialize_json(&payload.variables, "environment variables")?;
    connection
        .execute(
            "UPDATE environments SET variables_json = ?1, updated_at_epoch_ms = ?2 WHERE id = ?3 AND workspace_id = ?4",
            params![
                variables_json,
                now_epoch_ms(),
                payload.environment_id,
                payload.workspace_id
            ],
        )
        .map_err(|err| db_error("failed to update environment variables", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    load_environment_with_connection(&connection, &payload.workspace_id, &payload.environment_id)
}

pub fn delete_environment(
    db_path: &Path,
    payload: &DeleteEnvironmentPayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM environments WHERE id = ?1 AND workspace_id = ?2",
            params![payload.environment_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to delete environment", Some(err.to_string())))?;

    let fallback = connection
        .query_row(
            "SELECT id FROM environments WHERE workspace_id = ?1 ORDER BY updated_at_epoch_ms DESC LIMIT 1",
            params![payload.workspace_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| db_error("failed to query fallback environment", Some(err.to_string())))?;

    connection
        .execute(
            "UPDATE workspace_sessions SET active_environment_id = ?1, updated_at_epoch_ms = ?2 WHERE workspace_id = ?3",
            params![fallback, now_epoch_ms(), payload.workspace_id],
        )
        .map_err(|err| {
            db_error(
                "failed to update session after environment deletion",
                Some(err.to_string()),
            )
        })?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub(crate) fn load_environment_with_connection(
    connection: &Connection,
    workspace_id: &str,
    environment_id: &str,
) -> Result<EnvironmentDto, AppError> {
    let environments = load_environments_with_connection(connection, workspace_id)?;
    environments
        .into_iter()
        .find(|environment| environment.id == environment_id)
        .ok_or_else(|| db_error("environment not found", Some(environment_id.to_string())))
}

pub(crate) fn load_environments_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<EnvironmentDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, variables_json
             FROM environments
             WHERE workspace_id = ?1
             ORDER BY updated_at_epoch_ms DESC, created_at_epoch_ms DESC",
        )
        .map_err(|err| db_error("failed to prepare environment query", Some(err.to_string())))?;

    let rows = statement
        .query_map(params![workspace_id], |row| {
            let variables_json: String = row.get(2)?;
            let variables = serde_json::from_str(&variables_json).unwrap_or_default();
            Ok(EnvironmentDto {
                id: row.get(0)?,
                name: row.get(1)?,
                variables,
            })
        })
        .map_err(|err| db_error("failed to query environments", Some(err.to_string())))?;

    let mut environments = Vec::new();
    for row in rows {
        environments.push(
            row.map_err(|err| db_error("failed to map environment row", Some(err.to_string())))?,
        );
    }
    Ok(environments)
}

#[cfg(test)]
mod tests {
    use super::{
        create_environment, delete_environment, rename_environment, update_environment_variables,
    };
    use crate::models::{
        CreateEnvironmentPayloadDto, DeleteEnvironmentPayloadDto, KeyValueItemDto,
        RenameEnvironmentPayloadDto, SaveWorkspacePayloadDto, UpdateEnvironmentVariablesPayloadDto,
        WorkspaceSessionDto,
    };
    use crate::storage::connection::open_connection;
    use crate::storage::db::initialize_database;
    use crate::storage::repositories::workspace_repo::{
        ensure_bootstrap_data, load_workspace_session_with_connection, save_workspace_session,
    };
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
    fn environment_repo_rename_update_and_delete_keep_session_fallback() {
        let db_path = temp_db_path("environment-repo");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");
        let original_environment = bootstrap.environments[0].clone();

        let created = create_environment(
            &db_path,
            &CreateEnvironmentPayloadDto {
                workspace_id: workspace_id.clone(),
                name: "Staging".to_string(),
            },
        )
        .expect("environment created");
        let renamed = rename_environment(
            &db_path,
            &RenameEnvironmentPayloadDto {
                workspace_id: workspace_id.clone(),
                environment_id: created.id.clone(),
                name: "Prod".to_string(),
            },
        )
        .expect("environment renamed");
        assert_eq!(renamed.name, "Prod");

        let updated = update_environment_variables(
            &db_path,
            &UpdateEnvironmentVariablesPayloadDto {
                workspace_id: workspace_id.clone(),
                environment_id: created.id.clone(),
                variables: vec![KeyValueItemDto {
                    key: "baseUrl".to_string(),
                    value: "https://example.com".to_string(),
                    description: String::new(),
                    enabled: true,
                }],
            },
        )
        .expect("environment updated");
        assert_eq!(updated.variables.len(), 1);

        save_workspace_session(
            &db_path,
            &SaveWorkspacePayloadDto {
                workspace_id: workspace_id.clone(),
                session: WorkspaceSessionDto {
                    active_tab_id: None,
                    active_environment_id: Some(original_environment.id.clone()),
                    open_tabs: Vec::new(),
                },
            },
        )
        .expect("session saved");

        delete_environment(
            &db_path,
            &DeleteEnvironmentPayloadDto {
                workspace_id: workspace_id.clone(),
                environment_id: original_environment.id.clone(),
            },
        )
        .expect("environment deleted");

        let connection = open_connection(&db_path).expect("connection opened");
        let session = load_workspace_session_with_connection(&connection, &workspace_id)
            .expect("session query")
            .expect("session exists");
        assert_eq!(session.active_environment_id, Some(created.id.clone()));

        let _ = fs::remove_file(db_path);
    }
}
