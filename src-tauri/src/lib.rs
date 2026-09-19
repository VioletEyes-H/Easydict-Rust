mod http;
mod selection;
mod shortcut;

use tracing::{debug, error, info, warn};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

#[tauri::command]
fn log_message(level: String, message: String) {
    match level.as_str() {
        "error" => error!("[前端] {}", message),
        "warn" => warn!("[前端] {}", message),
        "info" => info!("[前端] {}", message),
        "debug" => debug!("[前端] {}", message),
        _ => info!("[前端] {}", message),
    }
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
            let _ = window.emit("window-hidden", ());
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();
    info!("Application starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(shortcut::create_plugin())
        .setup(|app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // macOS：未授权辅助功能权限时，创建一个独立的提示窗口
            #[cfg(target_os = "macos")]
            {
                if !unsafe { selection::ax_permission::AXIsProcessTrusted() } {
                    let _ = tauri::WebviewWindowBuilder::new(
                        app,
                        "permission",
                        tauri::WebviewUrl::App("/permission".into())
                    )
                    .title("需要辅助功能权限")
                    .inner_size(400.0, 180.0)
                    .resizable(false)
                    .decorations(true)
                    .center()
                    .focused(true)
                    .build();
                }
            }

            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &settings_item, &quit_item])?;

            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_focus();

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("Translate")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("settings") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let _ = tauri::WebviewWindowBuilder::new(
                                app,
                                "settings",
                                tauri::WebviewUrl::App("/settings".into()),
                            )
                            .title("设置")
                            .inner_size(800.0, 600.0)
                            .resizable(false)
                            .visible(false)
                            .center()
                            .build();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            log_message,
            show_main_window,
            http::http_get,
            http::http_post,
            http::play_system_tts,
            http::play_audio_stream,
            selection::translate_selection,
            selection::check_accessibility_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
