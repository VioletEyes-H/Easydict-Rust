use std::thread;
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tracing::{info, warn};

// ============================================================================
// 辅助功能权限（macOS）
// ============================================================================
#[cfg(target_os = "macos")]
pub mod ax_permission {
    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        pub fn AXIsProcessTrusted() -> bool;
        /// 传入 options 为 null 时行为同 AXIsProcessTrusted；
        /// 传入 {kAXTrustedCheckOptionPrompt: true} 可以触发系统弹窗。
        pub fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
    }
}

/// macOS 检查辅助功能权限。
/// - 已授权 → 返回 `Ok(true)`
/// - 未授权 → 返回 `Ok(false)`（不自动打开系统设置，由前端决定如何提示）
#[cfg(target_os = "macos")]
pub fn ensure_accessibility_permission() -> Result<bool, String> {
    let trusted = unsafe { ax_permission::AXIsProcessTrusted() };
    Ok(trusted)
}

/// 非 macOS 直接返回 true
#[cfg(not(target_os = "macos"))]
pub fn ensure_accessibility_permission() -> Result<bool, String> {
    Ok(true)
}

// ============================================================================
// macOS 原生 Accessibility API —— 直接读取选中文本（不经过剪贴板）
// 保留作为可选方案，目前 translate_selection 中不再优先调用。
// ============================================================================
#[cfg(target_os = "macos")]
mod ax_native {
    use std::ffi::{c_void, CStr, CString};

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        pub fn AXUIElementCreateSystemWide() -> AXUIElementRef;
        pub fn AXUIElementCopyAttributeValue(
            element: AXUIElementRef,
            attribute: CFStringRef,
            value: *mut CFTypeRef,
        ) -> AXError;
        pub fn CFRelease(cf: CFTypeRef);
        pub fn CFStringCreateWithCString(
            alloc: CFAllocatorRef,
            c_str: *const i8,
            encoding: CFStringEncoding,
        ) -> CFStringRef;
        pub fn CFStringGetLength(theString: CFStringRef) -> isize;
        pub fn CFStringGetCString(
            theString: CFStringRef,
            buffer: *mut i8,
            buffer_size: isize,
            encoding: CFStringEncoding,
        ) -> bool;
    }

    pub type AXUIElementRef = *const c_void;
    pub type CFStringRef = *const c_void;
    pub type CFTypeRef = *const c_void;
    pub type CFAllocatorRef = *const c_void;
    pub type AXError = i32;
    pub type CFStringEncoding = u32;

    pub const K_AX_ERROR_SUCCESS: AXError = 0;
    pub const K_CF_STRING_ENCODING_UTF8: CFStringEncoding = 0x08000100;

    pub fn cf_string(s: &str) -> CFStringRef {
        let c = CString::new(s).unwrap();
        unsafe { CFStringCreateWithCString(std::ptr::null(), c.as_ptr(), K_CF_STRING_ENCODING_UTF8) }
    }

    pub fn cf_string_to_rust(cf: CFStringRef) -> Option<String> {
        if cf.is_null() {
            return None;
        }
        unsafe {
            let len = CFStringGetLength(cf);
            let buf_size = len * 4 + 1;
            let mut buf = vec![0i8; buf_size as usize];
            if CFStringGetCString(cf, buf.as_mut_ptr(), buf_size, K_CF_STRING_ENCODING_UTF8) {
                CStr::from_ptr(buf.as_ptr() as *const i8)
                    .to_str()
                    .ok()
                    .map(|s| s.to_string())
            } else {
                None
            }
        }
    }
}

/// 通过 AX API 读取选中文本（保留，但当前 translate_selection 中不再优先调用）
#[cfg(target_os = "macos")]
#[allow(dead_code)]
fn get_selected_text_ax() -> Result<String, String> {
    use ax_native::*;

    unsafe {
        let system = AXUIElementCreateSystemWide();
        if system.is_null() {
            return Err("创建系统范围 AX 元素失败".to_string());
        }

        let attr_focused = cf_string("AXFocusedUIElement");
        let mut focused: CFTypeRef = std::ptr::null();

        let result = AXUIElementCopyAttributeValue(system, attr_focused, &mut focused);
        CFRelease(attr_focused);

        if result != K_AX_ERROR_SUCCESS || focused.is_null() {
            return Err("无法获取当前焦点元素".to_string());
        }

        let attr_selected = cf_string("AXSelectedText");
        let mut selected: CFTypeRef = std::ptr::null();

        let result = AXUIElementCopyAttributeValue(focused, attr_selected, &mut selected);
        CFRelease(attr_selected);
        CFRelease(focused);

        if result != K_AX_ERROR_SUCCESS || selected.is_null() {
            return Err("目标应用未暴露选中文本".to_string());
        }

        let text = cf_string_to_rust(selected).unwrap_or_default();
        CFRelease(selected);

        Ok(text)
    }
}

// ============================================================================
// 轮询工具
// ============================================================================
fn poll_changed<F>(read: F, original: &str, deadline: Duration, interval: Duration) -> String
where
    F: Fn() -> String,
{
    let start = Instant::now();
    while start.elapsed() < deadline {
        let current = read();
        if current != original {
            return current;
        }
        thread::sleep(interval);
    }
    String::new()
}

// ============================================================================
// 模拟复制（macOS 用 CGEvent）
// ============================================================================
#[cfg(target_os = "macos")]
fn simulate_copy() -> Result<(), String> {
    use objc2_core_graphics::{
        CGEvent, CGEventSource, CGEventSourceStateID, CGEventTapLocation, CGKeyCode,
    };

    // 检查辅助功能权限（不自动打开系统设置，仅返回错误）
    if !unsafe { ax_permission::AXIsProcessTrusted() } {
        return Err(
            "缺少辅助功能权限：请在「系统设置 → 隐私与安全性 → 辅助功能」授权本应用后重试"
                .to_string(),
        );
    }

    const KEYCODE_COMMAND: CGKeyCode = 0x37;
    const KEYCODE_C: CGKeyCode = 0x08;

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .ok_or_else(|| "创建 CGEventSource 失败".to_string())?;

    let cmd_down = CGEvent::new_keyboard_event(Some(&source), KEYCODE_COMMAND, true)
        .ok_or_else(|| "创建 Command 按下事件失败".to_string())?;
    CGEvent::post(CGEventTapLocation::SessionEventTap, Some(&cmd_down));

    // 延迟确保 Command 被系统识别为修饰键
    thread::sleep(Duration::from_millis(5));

    let c_down = CGEvent::new_keyboard_event(Some(&source), KEYCODE_C, true)
        .ok_or_else(|| "创建 C 按下事件失败".to_string())?;
    CGEvent::post(CGEventTapLocation::SessionEventTap, Some(&c_down));

    let c_up = CGEvent::new_keyboard_event(Some(&source), KEYCODE_C, false)
        .ok_or_else(|| "创建 C 抬起事件失败".to_string())?;
    CGEvent::post(CGEventTapLocation::SessionEventTap, Some(&c_up));

    let cmd_up = CGEvent::new_keyboard_event(Some(&source), KEYCODE_COMMAND, false)
        .ok_or_else(|| "创建 Command 抬起事件失败".to_string())?;
    CGEvent::post(CGEventTapLocation::SessionEventTap, Some(&cmd_up));

    Ok(())
}

// ============================================================================
// 模拟复制（Windows / Linux 用 enigo）
// ============================================================================
#[cfg(not(target_os = "macos"))]
fn simulate_copy() -> Result<(), String> {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(Key::Unicode('c'), Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(Key::Control, Direction::Release)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// 窗口操作
// ============================================================================
fn show_and_focus_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// 供前端调用：检查辅助功能权限。
#[tauri::command]
pub fn check_accessibility_permission() -> Result<bool, String> {
    ensure_accessibility_permission()
}

/// 划词翻译主入口：剪贴板方案（macOS/Win/Linux 通用）
#[tauri::command]
pub async fn translate_selection(app: tauri::AppHandle) -> Result<String, String> {
    let original = app.clipboard().read_text().unwrap_or_default();
    info!("original=>",);

    simulate_copy()?;

    let selected = poll_changed(
        || app.clipboard().read_text().unwrap_or_default(),
        &original,
        Duration::from_millis(200),
        Duration::from_millis(5),
    );
    info!("selected=>",);

    // 恢复原始剪贴板
    if !original.is_empty() {
        if let Err(e) = app.clipboard().write_text(original.as_str()) {
            warn!("恢复剪贴板失败: {}", e);
        }
    }

    show_and_focus_main(&app);
    Ok(selected)
}

// ============================================================================
// 测试
// ============================================================================
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_changed_content_immediately() {
        let result = poll_changed(
            || "selected text".to_string(),
            "original",
            Duration::from_millis(200),
            Duration::from_millis(5),
        );
        assert_eq!(result, "selected text");
    }

    #[test]
    fn returns_empty_on_timeout() {
        let result = poll_changed(
            || "original".to_string(),
            "original",
            Duration::from_millis(15),
            Duration::from_millis(5),
        );
        assert_eq!(result, "");
    }
}
