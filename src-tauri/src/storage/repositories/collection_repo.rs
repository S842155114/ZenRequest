use std::path::Path;

use rusqlite::{params, Connection};

use crate::errors::AppError;
use crate::models::{
    CollectionMutationPayloadDto, CreateCollectionPayloadDto, DeleteCollectionPayloadDto,
    RequestCollectionDto,
};
use crate::storage::connection::{
    db_error, generate_id, next_sort_order, now_epoch_ms, open_connection, touch_workspace,
};
use crate::storage::repositories::request_repo::load_requests_for_collection;

pub fn list_collections(
    db_path: &Path,
    workspace_id: &str,
) -> Result<Vec<RequestCollectionDto>, AppError> {
    let connection = open_connection(db_path)?;
    load_collections_with_connection(&connection, workspace_id)
}

pub fn create_collection(
    db_path: &Path,
    payload: &CreateCollectionPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    let connection = open_connection(db_path)?;
    let timestamp = now_epoch_ms();
    let next_sort = next_sort_order(
        &connection,
        "collections",
        "workspace_id",
        &payload.workspace_id,
    )?;
    let collection = RequestCollectionDto {
        id: generate_id("collection"),
        name: payload.name.trim().to_string(),
        expanded: true,
        requests: Vec::new(),
    };

    connection
        .execute(
            "INSERT INTO collections (id, workspace_id, name, description, expanded, sort_order, created_at_epoch_ms, updated_at_epoch_ms)
             VALUES (?1, ?2, ?3, '', 1, ?4, ?5, ?6)",
            params![
                collection.id,
                payload.workspace_id,
                collection.name,
                next_sort,
                timestamp,
                timestamp
            ],
        )
        .map_err(|err| db_error("failed to create collection", Some(err.to_string())))?;

    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(collection)
}

pub fn rename_collection(
    db_path: &Path,
    payload: &CollectionMutationPayloadDto,
) -> Result<RequestCollectionDto, AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "UPDATE collections SET name = ?1, updated_at_epoch_ms = ?2 WHERE id = ?3 AND workspace_id = ?4",
            params![
                payload.name.trim(),
                now_epoch_ms(),
                payload.collection_id,
                payload.workspace_id
            ],
        )
        .map_err(|err| db_error("failed to rename collection", Some(err.to_string())))?;

    let collection =
        load_collection_with_requests(&connection, &payload.workspace_id, &payload.collection_id)?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(collection)
}

pub fn delete_collection(
    db_path: &Path,
    payload: &DeleteCollectionPayloadDto,
) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "DELETE FROM collections WHERE id = ?1 AND workspace_id = ?2",
            params![payload.collection_id, payload.workspace_id],
        )
        .map_err(|err| db_error("failed to delete collection", Some(err.to_string())))?;
    touch_workspace(&connection, &payload.workspace_id)?;
    Ok(())
}

pub(crate) fn load_collection_with_requests(
    connection: &Connection,
    workspace_id: &str,
    collection_id: &str,
) -> Result<RequestCollectionDto, AppError> {
    let mut collections = load_collections_with_connection(connection, workspace_id)?;
    let found = collections
        .drain(..)
        .find(|collection| collection.id == collection_id);
    found.ok_or_else(|| db_error("collection not found", Some(collection_id.to_string())))
}

pub(crate) fn load_collections_with_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<RequestCollectionDto>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, name, expanded
             FROM collections
             WHERE workspace_id = ?1
             ORDER BY sort_order ASC, created_at_epoch_ms ASC",
        )
        .map_err(|err| db_error("failed to prepare collection query", Some(err.to_string())))?;

    let rows = statement
        .query_map(params![workspace_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)? != 0,
            ))
        })
        .map_err(|err| db_error("failed to query collections", Some(err.to_string())))?;

    let mut collections = Vec::new();
    for row in rows {
        let (id, name, expanded) =
            row.map_err(|err| db_error("failed to map collection row", Some(err.to_string())))?;
        let requests = load_requests_for_collection(connection, &id)?;

        collections.push(RequestCollectionDto {
            id,
            name,
            expanded,
            requests,
        });
    }

    Ok(collections)
}
