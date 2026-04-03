use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

use crate::errors::AppError;
use crate::models::AppSettings;
use crate::storage::connection::{db_error, deserialize_json, open_connection, serialize_json};

const SETTINGS_ROW_KEY: &str = "app_settings";

pub fn load_settings(db_path: &Path) -> Result<Option<AppSettings>, AppError> {
    let connection = open_connection(db_path)?;
    load_settings_with_connection(&connection)
}

pub fn save_settings(db_path: &Path, settings: &AppSettings) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
    save_settings_with_connection(&connection, settings)
}

pub(crate) fn load_settings_with_connection(
    connection: &Connection,
) -> Result<Option<AppSettings>, AppError> {
    let raw = connection
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![SETTINGS_ROW_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| db_error("failed to load settings from sqlite", Some(err.to_string())))?;

    raw.map(|value| deserialize_json::<AppSettings>(&value, "settings"))
        .transpose()
}

pub(crate) fn save_settings_with_connection(
    connection: &Connection,
    settings: &AppSettings,
) -> Result<(), AppError> {
    let payload = serialize_json(settings, "settings")?;

    connection
        .execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![SETTINGS_ROW_KEY, payload],
        )
        .map_err(|err| db_error("failed to save settings into sqlite", Some(err.to_string())))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{load_settings, save_settings};
    use crate::models::AppSettings;
    use crate::storage::connection::open_connection;
    use crate::storage::db::initialize_database;
    use rusqlite::params;
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
    fn settings_repo_roundtrips_values() {
        let db_path = temp_db_path("settings-roundtrip");
        initialize_database(&db_path).expect("database initialized");

        assert!(load_settings(&db_path).expect("settings loaded").is_none());

        let settings = AppSettings {
            locale: "zh-CN".to_string(),
            theme_mode: "light".to_string(),
        };
        save_settings(&db_path, &settings).expect("settings saved");

        let loaded = load_settings(&db_path)
            .expect("settings reloaded")
            .expect("settings exist");
        assert_eq!(loaded.locale, settings.locale);
        assert_eq!(loaded.theme_mode, settings.theme_mode);

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn settings_repo_surfaces_json_parse_errors() {
        let db_path = temp_db_path("settings-invalid-json");
        initialize_database(&db_path).expect("database initialized");

        let connection = open_connection(&db_path).expect("connection opened");
        connection
            .execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params!["app_settings", "{not-json}"],
            )
            .expect("invalid settings inserted");

        let error = load_settings(&db_path).expect_err("invalid json should fail");
        assert_eq!(error.code, "DB_ERROR");
        assert!(error.message.contains("failed to parse settings"));

        let _ = fs::remove_file(db_path);
    }
}
