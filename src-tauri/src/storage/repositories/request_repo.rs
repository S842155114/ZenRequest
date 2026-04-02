use std::path::Path;

use rusqlite::{params, Connection, Row};

use crate::errors::AppError;
use crate::models::{DeleteRequestPayloadDto, RequestPresetDto, SaveRequestPayloadDto};
use crate::storage::connection::{
    db_error, generate_id, next_sort_order, now_epoch_ms, open_connection, serialize_json,
    touch_workspace,
};

pub fn save_request(
    db_path: &Path,
    payload: &SaveRequestPayloadDto,
) -> Result<RequestPresetDto, AppError> {
    let connection = open_connection(db_path)?;
    save_request_with_connection(&connection, payload)
}

pub fn delete_request(db_path: &Path, payload: &DeleteRequestPayloadDto) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM requests WHERE id = ?1 AND workspace_id = ?2",
            params![payload.request_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to delete request", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub(crate) fn load_request_with_collection_name(
    connection: &Connection,
    request_id: &str,
) -> Result<RequestPresetDto, AppError> {
    connection
        .query_row(
            "SELECT r.id, r.workspace_id, r.collection_id, c.name, r.name, r.description, r.tags_json, r.method, r.url, r.params_json, r.headers_json, r.body, r.body_type, r.body_content_type, r.form_data_fields_json, r.binary_file_name, r.binary_mime_type, r.auth_json, r.tests_json, r.mock_json
             FROM requests r
             JOIN collections c ON c.id = r.collection_id
             WHERE r.id = ?1",
            params![request_id],
            map_request_row,
        )
        .map_err(|err| db_error("failed to load request", Some(err.to_string())))
}

pub(crate) fn load_requests_for_collection(
    connection: &Connection,
    collection_id: &str,
) -> Result<Vec<RequestPresetDto>, AppError> {
    let mut request_statement = connection
        .prepare(
            "SELECT r.id, r.workspace_id, r.collection_id, c.name, r.name, r.description, r.tags_json, r.method, r.url, r.params_json, r.headers_json, r.body, r.body_type, r.body_content_type, r.form_data_fields_json, r.binary_file_name, r.binary_mime_type, r.auth_json, r.tests_json, r.mock_json
             FROM requests r
             JOIN collections c ON c.id = r.collection_id
             WHERE r.collection_id = ?1
             ORDER BY r.sort_order ASC, r.created_at_epoch_ms ASC",
        )
        .map_err(|err| db_error("failed to prepare request query", Some(err.to_string())))?;

    let request_rows = request_statement
        .query_map(params![collection_id], map_request_row)
        .map_err(|err| db_error("failed to query requests", Some(err.to_string())))?;

    let mut requests = Vec::new();
    for request_row in request_rows {
        requests.push(
            request_row
                .map_err(|err| db_error("failed to map request row", Some(err.to_string())))?,
        );
    }

    Ok(requests)
}

fn save_request_with_connection(
    connection: &Connection,
    payload: &SaveRequestPayloadDto,
) -> Result<RequestPresetDto, AppError> {
    let timestamp = now_epoch_ms();
    let request_id = if payload.request.id.is_empty() {
        generate_id("request")
    } else {
        payload.request.id.clone()
    };
    let tags_json = serialize_json(&payload.request.tags, "request tags")?;
    let params_json = serialize_json(&payload.request.params, "request params")?;
    let headers_json = serialize_json(&payload.request.headers, "request headers")?;
    let auth_json = serialize_json(&payload.request.auth, "request auth")?;
    let tests_json = serialize_json(&payload.request.tests, "request tests")?;
    let mock_json = serialize_json(&payload.request.mock, "request mock")?;
    let form_data_fields_json = serialize_json(
        &payload.request.form_data_fields,
        "request form data fields",
    )?;
    let sort_order = next_sort_order(
        connection,
        "requests",
        "collection_id",
        &payload.collection_id,
    )?;

    connection
        .execute(
            "INSERT INTO requests
             (id, workspace_id, collection_id, name, description, tags_json, method, url, params_json, headers_json, body, body_type, body_content_type, form_data_fields_json, binary_file_name, binary_mime_type, auth_json, tests_json, mock_json, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)
             ON CONFLICT(id) DO UPDATE SET
               workspace_id = excluded.workspace_id,
               collection_id = excluded.collection_id,
               name = excluded.name,
               description = excluded.description,
               tags_json = excluded.tags_json,
               method = excluded.method,
               url = excluded.url,
               params_json = excluded.params_json,
               headers_json = excluded.headers_json,
               body = excluded.body,
               body_type = excluded.body_type,
               body_content_type = excluded.body_content_type,
               form_data_fields_json = excluded.form_data_fields_json,
               binary_file_name = excluded.binary_file_name,
               binary_mime_type = excluded.binary_mime_type,
               auth_json = excluded.auth_json,
               tests_json = excluded.tests_json,
               mock_json = excluded.mock_json,
               updated_at_epoch_ms = excluded.updated_at_epoch_ms",
            params![
                request_id,
                payload.workspace_id,
                payload.collection_id,
                payload.request.name,
                payload.request.description,
                tags_json,
                payload.request.method,
                payload.request.url,
                params_json,
                headers_json,
                payload.request.body,
                payload.request.body_type,
                payload.request.body_content_type,
                form_data_fields_json,
                payload.request.binary_file_name,
                payload.request.binary_mime_type,
                auth_json,
                tests_json,
                mock_json,
                sort_order,
                timestamp,
                timestamp
            ],
        )
        .map_err(|err| db_error("failed to save request", Some(err.to_string())))?;

    touch_workspace(connection, &payload.workspace_id)?;
    load_request_with_collection_name(connection, &request_id)
}

fn map_request_row(row: &Row<'_>) -> rusqlite::Result<RequestPresetDto> {
    let tags_json: String = row.get(6)?;
    let params_json: String = row.get(9)?;
    let headers_json: String = row.get(10)?;
    let form_data_fields_json: String = row.get(14)?;
    let auth_json: String = row.get(17)?;
    let tests_json: String = row.get(18)?;
    let mock_json: String = row.get(19)?;

    Ok(RequestPresetDto {
        id: row.get(0)?,
        workspace_id: Some(row.get(1)?),
        collection_id: Some(row.get(2)?),
        collection_name: Some(row.get(3)?),
        name: row.get(4)?,
        description: row.get(5)?,
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
        method: row.get(7)?,
        url: row.get(8)?,
        params: serde_json::from_str(&params_json).unwrap_or_default(),
        headers: serde_json::from_str(&headers_json).unwrap_or_default(),
        body: row.get(11)?,
        body_type: row.get(12)?,
        body_content_type: row.get(13)?,
        form_data_fields: serde_json::from_str(&form_data_fields_json).unwrap_or_default(),
        binary_file_name: row.get(15)?,
        binary_mime_type: row.get(16)?,
        auth: serde_json::from_str(&auth_json).unwrap_or_default(),
        tests: serde_json::from_str(&tests_json).unwrap_or_default(),
        mock: serde_json::from_str(&mock_json).unwrap_or_default(),
    })
}

#[cfg(test)]
mod tests {
    use super::save_request;
    use crate::models::request::{RequestMockStateDto, RequestTestDefinitionDto};
    use crate::models::{KeyValueItemDto, RequestPresetDto, SaveRequestPayloadDto};
    use crate::storage::connection::open_connection;
    use crate::storage::db::initialize_database;
    use crate::storage::repositories::collection_repo::load_collections_with_connection;
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
    fn request_repo_roundtrips_mock_and_body_metadata() {
        let db_path = temp_db_path("request-repo-roundtrip");
        initialize_database(&db_path).expect("database initialized");

        let bootstrap = ensure_bootstrap_data(&db_path, None).expect("bootstrap payload");
        let workspace_id = bootstrap
            .active_workspace_id
            .clone()
            .expect("active workspace id");
        let collection = bootstrap.collections[0].clone();

        let saved = save_request(
            &db_path,
            &SaveRequestPayloadDto {
                workspace_id: workspace_id.clone(),
                collection_id: collection.id.clone(),
                request: RequestPresetDto {
                    id: "request-repo-roundtrip".to_string(),
                    name: "GraphQL".to_string(),
                    description: "Request repo roundtrip".to_string(),
                    tags: vec!["graphql".to_string(), "repo".to_string()],
                    method: "POST".to_string(),
                    url: "https://example.com/graphql".to_string(),
                    workspace_id: Some(workspace_id.clone()),
                    collection_id: Some(collection.id.clone()),
                    collection_name: Some(collection.name.clone()),
                    params: vec![KeyValueItemDto {
                        key: "expand".to_string(),
                        value: "viewer".to_string(),
                        description: String::new(),
                        enabled: true,
                    }],
                    headers: vec![KeyValueItemDto {
                        key: "Content-Type".to_string(),
                        value: "application/graphql".to_string(),
                        description: String::new(),
                        enabled: true,
                    }],
                    body: "query { viewer { id } }".to_string(),
                    body_type: "raw".to_string(),
                    body_content_type: Some("application/graphql".to_string()),
                    form_data_fields: Vec::new(),
                    binary_file_name: None,
                    binary_mime_type: None,
                    auth: crate::models::AuthConfigDto {
                        r#type: "bearer".to_string(),
                        bearer_token: "repo-token".to_string(),
                        ..Default::default()
                    },
                    tests: vec![RequestTestDefinitionDto {
                        id: "status-200".to_string(),
                        name: "Status is 200".to_string(),
                        source: "status".to_string(),
                        operator: "equals".to_string(),
                        target: String::new(),
                        expected: "200".to_string(),
                    }],
                    mock: Some(RequestMockStateDto {
                        enabled: true,
                        status: 202,
                        status_text: "Accepted".to_string(),
                        content_type: "application/json".to_string(),
                        body: "{\"source\":\"mock\"}".to_string(),
                        headers: vec![KeyValueItemDto {
                            key: "X-Mock".to_string(),
                            value: "enabled".to_string(),
                            description: String::new(),
                            enabled: true,
                        }],
                    }),
                },
            },
        )
        .expect("request saved");

        assert_eq!(saved.tags, vec!["graphql".to_string(), "repo".to_string()]);
        assert_eq!(saved.auth.r#type, "bearer");
        assert_eq!(saved.tests.len(), 1);
        assert_eq!(
            saved.body_content_type,
            Some("application/graphql".to_string())
        );
        assert_eq!(saved.mock.as_ref().map(|mock| mock.status), Some(202));

        let connection = open_connection(&db_path).expect("connection opened");
        let collections = load_collections_with_connection(&connection, &workspace_id)
            .expect("collections loaded");
        let persisted = collections[0]
            .requests
            .iter()
            .find(|request| request.id == "request-repo-roundtrip")
            .expect("saved request persisted");

        assert_eq!(persisted.auth.r#type, "bearer");
        assert_eq!(persisted.tests[0].expected, "200");
        assert_eq!(
            persisted.body_content_type,
            Some("application/graphql".to_string())
        );
        assert_eq!(
            persisted.mock.as_ref().map(|mock| mock.body.as_str()),
            Some("{\"source\":\"mock\"}")
        );

        let _ = fs::remove_file(db_path);
    }
}
