use tracing::info;

/// 创建全局快捷键插件
pub fn create_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|_app, shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                info!("Global shortcut pressed: {:?}", shortcut);
            }
        })
        .build()
}
