mod commands;
mod models;

use commands::*;
use tauri::menu::{AboutMetadata, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Custom menu items
            let settings_item = MenuItemBuilder::new("Settings...")
                .id("settings")
                .accelerator("Cmd+,")
                .build(app)?;

            let new_item = MenuItemBuilder::new("New")
                .id("new")
                .accelerator("Cmd+N")
                .build(app)?;

            let open_item = MenuItemBuilder::new("Open...")
                .id("open")
                .accelerator("Cmd+O")
                .build(app)?;

            let save_item = MenuItemBuilder::new("Save")
                .id("save")
                .accelerator("Cmd+S")
                .build(app)?;

            let save_as_item = MenuItemBuilder::new("Save As...")
                .id("save_as")
                .accelerator("Cmd+Shift+S")
                .build(app)?;

            let rename_item = MenuItemBuilder::new("Rename...")
                .id("rename")
                .build(app)?;

            // App menu (WriteCraft menu)
            let app_submenu = SubmenuBuilder::new(app, "WriteCraft")
                .about(Some(AboutMetadata {
                    name: Some("WriteCraft".into()),
                    ..Default::default()
                }))
                .separator()
                .item(&settings_item)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // File menu
            let file_submenu = SubmenuBuilder::new(app, "File")
                .item(&new_item)
                .item(&open_item)
                .separator()
                .item(&save_item)
                .item(&save_as_item)
                .item(&rename_item)
                .separator()
                .close_window()
                .build()?;

            // Edit menu
            let edit_submenu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // View menu
            let view_submenu = SubmenuBuilder::new(app, "View")
                .fullscreen()
                .build()?;

            // Window menu
            let window_submenu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .maximize()
                .separator()
                .close_window()
                .build()?;

            // Build the full menu
            let menu = MenuBuilder::new(app)
                .item(&app_submenu)
                .item(&file_submenu)
                .item(&edit_submenu)
                .item(&view_submenu)
                .item(&window_submenu)
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("menu-event", id);
            }
        })
        .invoke_handler(tauri::generate_handler![
            // File commands
            read_document,
            write_document,
            read_sidecar,
            write_sidecar,
            file_exists,
            get_sidecar_path_for_document,
            rename_document,
            // Keychain commands
            get_api_key,
            set_api_key,
            delete_api_key,
            test_api_key,
            // Claude API commands
            send_message,
            send_message_with_tools
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
