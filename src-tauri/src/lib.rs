mod commands;
mod models;

use commands::*;
use tauri::menu::{AboutMetadata, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize Sentry for error tracking in production
    let _guard = sentry::init(("https://ec6186285bfdb62cefaa94efc2bfb76a@o4510757633523712.ingest.us.sentry.io/4510757643288576", sentry::ClientOptions {
        release: sentry::release_name!(),
        environment: Some("production".into()),
        traces_sample_rate: 0.1,
        ..Default::default()
    }));

    // Initialize tracing for structured logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // When a second instance is launched (e.g., from OAuth callback),
            // forward the deep link URL to the existing instance
            if let Some(window) = app.get_webview_window("main") {
                // Focus the existing window
                let _ = window.set_focus();

                // Check if any argument looks like a deep link URL
                for arg in args.iter() {
                    if arg.starts_with("fizz://") {
                        let _ = window.emit("deep-link", arg.clone());
                    }
                }
            }
        }))
        .setup(|app| {
            // Custom menu items
            let check_updates_item = MenuItemBuilder::new("Check for Updates...")
                .id("check_updates")
                .build(app)?;

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

            let export_pdf_item = MenuItemBuilder::new("Export as PDF...")
                .id("export_pdf")
                .accelerator("Cmd+Shift+E")
                .build(app)?;

            let export_word_item = MenuItemBuilder::new("Export as Word...")
                .id("export_word")
                .build(app)?;

            let toggle_preview_item = MenuItemBuilder::new("Toggle Source/Preview")
                .id("toggle_preview")
                .accelerator("Cmd+/")
                .build(app)?;

            let focus_mode_item = MenuItemBuilder::new("Focus Mode")
                .id("focus_mode")
                .accelerator("Cmd+Shift+F")
                .build(app)?;

            // Edit menu items with custom IDs so we can handle them in the frontend
            let undo_item = MenuItemBuilder::new("Undo")
                .id("undo")
                .accelerator("Cmd+Z")
                .build(app)?;

            let redo_item = MenuItemBuilder::new("Redo")
                .id("redo")
                .accelerator("Cmd+Shift+Z")
                .build(app)?;

            // App menu (WriteCraft menu)
            let app_submenu = SubmenuBuilder::new(app, "WriteCraft")
                .about(Some(AboutMetadata {
                    name: Some("WriteCraft".into()),
                    ..Default::default()
                }))
                .separator()
                .item(&check_updates_item)
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
                .item(&export_pdf_item)
                .item(&export_word_item)
                .separator()
                .close_window()
                .build()?;

            // Edit menu
            let edit_submenu = SubmenuBuilder::new(app, "Edit")
                .item(&undo_item)
                .item(&redo_item)
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // View menu
            let view_submenu = SubmenuBuilder::new(app, "View")
                .item(&toggle_preview_item)
                .item(&focus_mode_item)
                .separator()
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

            // Register deep link handler for OAuth callbacks
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;

                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    // Get the URLs from the event
                    for url in event.urls() {
                        // Emit to frontend for handling
                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = window.emit("deep-link", url.to_string());
                        }
                    }
                });
            }

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
            get_writecraft_documents_dir,
            // Keychain commands (for legacy API key support)
            get_api_key,
            set_api_key,
            delete_api_key,
            test_api_key,
            // Auth commands
            sign_up,
            sign_in,
            sign_in_with_oauth,
            open_oauth_url,
            handle_oauth_callback,
            sign_out,
            get_session,
            refresh_session,
            reset_password,
            get_profile,
            update_profile,
            get_subscription_info,
            get_checkout_url,
            get_billing_portal_url,
            debug_auth_state,
            // Claude API commands
            send_message,
            send_message_with_tools,
            send_message_authenticated
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
