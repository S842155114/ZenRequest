use tauri::State;

use crate::core::app_state::AppState;
use crate::models::{ApiEnvelope, AppSettings};
use crate::storage::db;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> ApiEnvelope<AppSettings> {
    let settings = state
        .settings_cache
        .read()
        .ok()
        .and_then(|guard| guard.clone())
        .unwrap_or_default();

    ApiEnvelope::success(settings)
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    payload: AppSettings,
) -> ApiEnvelope<AppSettings> {
    if let Err(error) = db::save_settings(&state.db_path, &payload) {
        return ApiEnvelope::failure(error);
    }

    if let Ok(mut guard) = state.settings_cache.write() {
        *guard = Some(payload.clone());
    }

    ApiEnvelope::success(payload)
}
