use std::path::PathBuf;
use tauri::Manager;

use super::runtime_capabilities::{
    CapabilityRegistry, HookRegistry, ImportRegistry, ProtocolRegistry,
};
use crate::errors::AppError;
use crate::models::AppSettings;
use crate::storage::db;

#[derive(Debug)]
pub struct AppState {
    pub settings_cache: std::sync::RwLock<Option<AppSettings>>,
    pub db_path: PathBuf,
    #[allow(dead_code)]
    pub capability_registry: CapabilityRegistry,
    pub protocol_registry: ProtocolRegistry,
    #[allow(dead_code)]
    pub import_registry: ImportRegistry,
    #[allow(dead_code)]
    pub hook_registry: HookRegistry,
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

        Ok(Self {
            settings_cache: std::sync::RwLock::new(Some(settings)),
            db_path,
            capability_registry: CapabilityRegistry::with_builtin_defaults(),
            protocol_registry: ProtocolRegistry::with_builtin_defaults(),
            import_registry: ImportRegistry::with_builtin_defaults(),
            hook_registry: HookRegistry::with_builtin_defaults(),
        })
    }
}
