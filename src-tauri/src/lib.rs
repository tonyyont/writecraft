mod commands;
mod models;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_document,
            write_document,
            read_sidecar,
            write_sidecar,
            file_exists,
            get_sidecar_path_for_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
