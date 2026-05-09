mod http;

use tracing::{debug, error, info, warn};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();
    info!("Application starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &settings_item, &quit_item])?;

            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_focus();
            #[cfg(target_os = "macos")]
            {
                apply_vibrancy(
                    &window,
                    NSVisualEffectMaterial::HudWindow,
                    None,
                    Some(12.0),
                ).expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

                // 让窗口背景透明，使 NSVisualEffectView 的圆角可见
                use objc2::msg_send;
                use objc2_app_kit::{NSColor, NSWindow};
                use objc2::runtime::Bool;
                unsafe {
                    let ns_window = window.ns_window().unwrap() as *mut objc2::runtime::AnyObject;
                    let ns_window: &NSWindow = &*(ns_window as *const NSWindow);
                    ns_window.setOpaque(false);
                    ns_window.setBackgroundColor(Some(&NSColor::clearColor()));

                    if let Some(content_view) = ns_window.contentView() {
                        content_view.setWantsLayer(true);
                        if let Some(layer) = content_view.layer() {
                            let _: () = msg_send![&layer, setCornerRadius: 12.0_f64];
                            let _: () = msg_send![&layer, setMasksToBounds: Bool::YES];
                        }
                    }
                }
            }

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
        .invoke_handler(tauri::generate_handler![log_message, http::http_get, http::http_post, http::play_system_tts, http::play_audio_stream])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
