use std::path::PathBuf;
use tauri::Manager;

use crate::errors::AppError;
use crate::models::AppSettings;
use crate::storage::db;

#[derive(Debug)]
pub struct AppState {
    pub settings_cache: std::sync::RwLock<Option<AppSettings>>,
    pub http_client: reqwest::Client,
    pub db_path: PathBuf,
}

impl AppState {
    pub fn initialize(app_handle: &tauri::AppHandle) -> Result<Self, AppError> {
        let app_data_dir = app_handle.path().app_data_dir().map_err(|err| AppError {
            code: "APP_PATH_ERROR".to_string(),
            message: "failed to resolve app data directory".to_string(),
            details: Some(err.to_string()),
        })?;
        let db_path = app_data_dir.join("zenrequest.sqlite3");

        db::initialize_database(&db_path)?;
        let settings = db::load_settings(&db_path)?.unwrap_or_default();

        let client = reqwest::Client::builder()
            .user_agent("zenrequest/0.1.0")
            .build()
            .expect("failed to build http client");

        Ok(Self {
            settings_cache: std::sync::RwLock::new(Some(settings)),
            http_client: client,
            db_path,
        })
    }
}
