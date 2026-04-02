use std::path::Path;

use rusqlite::Connection;

use crate::errors::AppError;

pub const BASELINE_SCHEMA_VERSION: i64 = 5;

const V1_BASELINE_SQL: &str = include_str!("migrations/sql/V1__baseline.sql");
const V2_REQUEST_TESTS_SQL: &str = include_str!("migrations/sql/V2__request_tests.sql");
const V3_REQUEST_MOCK_SQL: &str = include_str!("migrations/sql/V3__request_mock.sql");
const V4_REQUEST_BODY_METADATA_SQL: &str =
    include_str!("migrations/sql/V4__request_body_metadata.sql");
const V5_HISTORY_EXECUTION_SOURCE_SQL: &str =
    include_str!("migrations/sql/V5__history_execution_source.sql");

struct MigrationStep {
    version: i64,
    name: &'static str,
    sql: &'static str,
    already_applied: fn(&Connection) -> Result<bool, AppError>,
}

fn migration_error(message: impl Into<String>, details: Option<String>) -> AppError {
    AppError {
        code: "DB_ERROR".to_string(),
        message: message.into(),
        details,
    }
}

fn schema_version(connection: &Connection) -> Result<i64, AppError> {
    connection
        .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
        .map_err(|err| {
            migration_error(
                "failed to read sqlite schema version",
                Some(err.to_string()),
            )
        })
}

fn write_schema_version(
    connection: &Connection,
    db_path: &Path,
    version: i64,
) -> Result<(), AppError> {
    connection
        .pragma_update(None, "user_version", version)
        .map_err(|err| {
            migration_error(
                "failed to write sqlite schema version",
                Some(format!("{} ({})", db_path.display(), err)),
            )
        })
}

fn table_has_column(connection: &Connection, table: &str, column: &str) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|err| {
            migration_error(
                format!("failed to inspect {table} schema"),
                Some(err.to_string()),
            )
        })?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|err| {
            migration_error(
                format!("failed to query {table} schema"),
                Some(err.to_string()),
            )
        })?;

    for row in rows {
        let name = row.map_err(|err| {
            migration_error(
                format!("failed to read {table} schema"),
                Some(err.to_string()),
            )
        })?;
        if name == column {
            return Ok(true);
        }
    }

    Ok(false)
}

fn migration_steps() -> [MigrationStep; 5] {
    [
        MigrationStep {
            version: 1,
            name: "baseline",
            sql: V1_BASELINE_SQL,
            already_applied: |_| Ok(false),
        },
        MigrationStep {
            version: 2,
            name: "request_tests",
            sql: V2_REQUEST_TESTS_SQL,
            already_applied: |connection| table_has_column(connection, "requests", "tests_json"),
        },
        MigrationStep {
            version: 3,
            name: "request_mock",
            sql: V3_REQUEST_MOCK_SQL,
            already_applied: |connection| table_has_column(connection, "requests", "mock_json"),
        },
        MigrationStep {
            version: 4,
            name: "request_body_metadata",
            sql: V4_REQUEST_BODY_METADATA_SQL,
            already_applied: |connection| {
                Ok(
                    table_has_column(connection, "requests", "body_content_type")?
                        && table_has_column(connection, "requests", "form_data_fields_json")?
                        && table_has_column(connection, "requests", "binary_file_name")?
                        && table_has_column(connection, "requests", "binary_mime_type")?,
                )
            },
        },
        MigrationStep {
            version: 5,
            name: "history_execution_source",
            sql: V5_HISTORY_EXECUTION_SOURCE_SQL,
            already_applied: |connection| {
                table_has_column(connection, "history_items", "execution_source")
            },
        },
    ]
}

fn run_migration_steps(
    connection: &mut Connection,
    db_path: &Path,
    steps: &[MigrationStep],
) -> Result<(), AppError> {
    let current_version = schema_version(connection)?;
    if current_version > BASELINE_SCHEMA_VERSION {
        return Err(migration_error(
            "sqlite schema version is newer than this build supports",
            Some(format!(
                "{} (current version {}, supported version {})",
                db_path.display(),
                current_version,
                BASELINE_SCHEMA_VERSION
            )),
        ));
    }

    let mut applied_version = current_version;
    for step in steps {
        if step.version <= applied_version {
            continue;
        }

        if (step.already_applied)(connection)? {
            write_schema_version(connection, db_path, step.version)?;
            applied_version = step.version;
            continue;
        }

        let tx = connection.transaction().map_err(|err| {
            migration_error(
                format!(
                    "failed to start sqlite migration v{} ({})",
                    step.version, step.name
                ),
                Some(format!("{} ({})", db_path.display(), err)),
            )
        })?;

        tx.execute_batch(step.sql).map_err(|err| {
            migration_error(
                format!(
                    "failed to run sqlite migration v{} ({})",
                    step.version, step.name
                ),
                Some(format!("{} ({})", db_path.display(), err)),
            )
        })?;
        write_schema_version(&tx, db_path, step.version)?;
        tx.commit().map_err(|err| {
            migration_error(
                format!(
                    "failed to commit sqlite migration v{} ({})",
                    step.version, step.name
                ),
                Some(format!("{} ({})", db_path.display(), err)),
            )
        })?;

        applied_version = step.version;
    }

    Ok(())
}

pub fn run_migrations(connection: &mut Connection, db_path: &Path) -> Result<(), AppError> {
    let steps = migration_steps();
    run_migration_steps(connection, db_path, &steps)
}

#[cfg(test)]
mod tests {
    use super::{
        run_migration_steps, run_migrations, schema_version, table_has_column, MigrationStep,
        BASELINE_SCHEMA_VERSION,
    };
    use rusqlite::Connection;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_db_path(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default();
        std::env::temp_dir().join(format!("zenrequest-migrations-{name}-{suffix}.sqlite3"))
    }

    fn never_applied(_: &Connection) -> Result<bool, crate::errors::AppError> {
        Ok(false)
    }

    #[test]
    fn run_migrations_applies_all_steps_for_fresh_databases() {
        let db_path = temp_db_path("fresh");
        let mut connection = Connection::open(&db_path).expect("connection opened");
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .expect("foreign keys enabled");

        run_migrations(&mut connection, &db_path).expect("migrations applied");

        assert_eq!(
            schema_version(&connection).expect("schema version"),
            BASELINE_SCHEMA_VERSION
        );
        assert!(table_has_column(&connection, "requests", "tests_json").expect("requests tests"));
        assert!(table_has_column(&connection, "requests", "mock_json").expect("requests mock"));
        assert!(
            table_has_column(&connection, "requests", "body_content_type")
                .expect("requests body content type")
        );
        assert!(
            table_has_column(&connection, "history_items", "execution_source")
                .expect("history execution source")
        );

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn run_migrations_is_a_no_op_for_latest_schema() {
        let db_path = temp_db_path("noop");
        let mut connection = Connection::open(&db_path).expect("connection opened");
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .expect("foreign keys enabled");

        run_migrations(&mut connection, &db_path).expect("migrations applied");
        run_migrations(&mut connection, &db_path).expect("migrations reapplied");

        assert_eq!(
            schema_version(&connection).expect("schema version"),
            BASELINE_SCHEMA_VERSION
        );

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn run_migrations_reports_failed_version_context() {
        let db_path = temp_db_path("broken");
        let mut connection = Connection::open(&db_path).expect("connection opened");
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .expect("foreign keys enabled");

        let steps = [
            MigrationStep {
                version: 1,
                name: "baseline",
                sql: "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
                already_applied: never_applied,
            },
            MigrationStep {
                version: 2,
                name: "broken_step",
                sql: "THIS IS NOT VALID SQL;",
                already_applied: never_applied,
            },
        ];

        let error =
            run_migration_steps(&mut connection, &db_path, &steps).expect_err("migration error");
        assert!(error.message.contains("v2"));
        assert!(error.message.contains("broken_step"));

        let _ = fs::remove_file(db_path);
    }
}
