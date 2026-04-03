mod commands;
mod core;
mod errors;
mod models;
mod services;
mod storage;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let state = core::app_state::AppState::initialize(app.handle())?;
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::workspace::bootstrap_app,
            commands::workspace::save_workspace,
            commands::workspace::list_workspaces,
            commands::workspace::create_workspace,
            commands::workspace::delete_workspace,
            commands::workspace::set_active_workspace,
            commands::workspace::export_workspace,
            commands::workspace::import_workspace,
            commands::workspace::save_text_file,
            commands::importing::import_curl_request,
            commands::importing::analyze_openapi_import,
            commands::importing::apply_openapi_import,
            commands::collections::list_collections,
            commands::collections::create_collection,
            commands::collections::rename_collection,
            commands::collections::delete_collection,
            commands::collections::save_request,
            commands::collections::delete_request,
            commands::environments::list_environments,
            commands::environments::create_environment,
            commands::environments::rename_environment,
            commands::environments::delete_environment,
            commands::environments::update_environment_variables,
            commands::history::list_history,
            commands::history::clear_history,
            commands::history::remove_history_item,
            commands::request::send_request,
            commands::settings::get_settings,
            commands::settings::update_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
