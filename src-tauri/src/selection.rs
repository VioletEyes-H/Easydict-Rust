use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tracing::{info, warn};

/// 权限缺失时返回给前端的统一错误文案（两处拒绝路径共用）
const PERMISSION_DENIED_MSG: &str = "缺少辅助功能权限，已弹出授权提示";

// ============================================================================
// 辅助功能权限全局状态（全局变量）
// ============================================================================
/// 记录辅助功能授权状态的全局变量。
/// - `granted == true`：已授权，`translate_selection` 不再重复询问系统，也不弹提示窗口
/// - `granted == false`：每次触发时重新向系统确认（用户可能已在系统设置中授权），
///   确认仍未授权则弹出提示窗口
pub struct AccessibilityState {
    granted: AtomicBool,
}

impl AccessibilityState {
    pub fn new(granted: bool) -> Self {
        Self {
            granted: AtomicBool::new(granted),
        }
    }

    pub fn is_granted(&self) -> bool {
        self.granted.load(Ordering::Relaxed)
    }

    pub fn set_granted(&self, granted: bool) {
        self.granted.store(granted, Ordering::Relaxed);
    }
}

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
// 作为 translate_selection 的首选方案；读不到时回退到剪贴板方案。
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

/// 通过 AX API 读取选中文本（translate_selection 首选方案）
#[cfg(target_os = "macos")]
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

        // 出错时不读取/释放 selected：AX API 失败时其值无保证，可能是非法指针
        if result != K_AX_ERROR_SUCCESS {
            return Err("无法读取选中文本属性".to_string());
        }
        if selected.is_null() {
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
fn simulate_copy(app: &tauri::AppHandle, state: &AccessibilityState) -> Result<(), String> {
    use objc2_core_graphics::{
        CGEvent, CGEventFlags, CGEventSource, CGEventSourceStateID, CGEventTapLocation, CGKeyCode,
    };

    // 兜底检查：全局状态为已授权但运行中权限被撤销时，回写状态并弹出授权提示窗口
    if !unsafe { ax_permission::AXIsProcessTrusted() } {
        state.set_granted(false);
        show_permission_window(app);
        return Err(PERMISSION_DENIED_MSG.to_string());
    }

    const KEYCODE_COMMAND: CGKeyCode = 0x37;
    const KEYCODE_C: CGKeyCode = 0x08;

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .ok_or_else(|| "创建 CGEventSource 失败".to_string())?;

    let cmd_down = CGEvent::new_keyboard_event(Some(&source), KEYCODE_COMMAND, true)
        .ok_or_else(|| "创建 Command 按下事件失败".to_string())?;
    CGEvent::post(CGEventTapLocation::SessionEventTap, Some(&cmd_down));

    // 延迟确保 Command 被系统识别为修饰键
    thread::sleep(Duration::from_millis(15));

    // C 键事件需自带 Command 标志：部分应用（如 Sublime）只读事件 flags，
    // 不跟踪修饰键状态，缺了会被当成普通字符输入
    let c_down = CGEvent::new_keyboard_event(Some(&source), KEYCODE_C, true)
        .ok_or_else(|| "创建 C 按下事件失败".to_string())?;
    CGEvent::set_flags(Some(&c_down), CGEventFlags::MaskCommand);
    CGEvent::post(CGEventTapLocation::SessionEventTap, Some(&c_down));

    let c_up = CGEvent::new_keyboard_event(Some(&source), KEYCODE_C, false)
        .ok_or_else(|| "创建 C 抬起事件失败".to_string())?;
    CGEvent::set_flags(Some(&c_up), CGEventFlags::MaskCommand);
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

/// 显示（或创建）辅助功能授权提示窗口。
/// 已存在则前置显示，不存在则新建，供启动检查和 `translate_selection` 拒绝时复用。
/// 创建失败（如并发下 label 已被其他调用占用）时退化为前置显示，故不返回错误。
pub fn show_permission_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("permission") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    match tauri::WebviewWindowBuilder::new(
        app,
        "permission",
        tauri::WebviewUrl::App("/permission".into()),
    )
    .title("需要辅助功能权限")
    .inner_size(400.0, 200.0)
    .resizable(false)
    .decorations(true)
    .center()
    .focused(true)
    .build()
    {
        Ok(_) => {}
        Err(_) => {
            // 并发触发时窗口可能已被另一个调用创建，退化为前置显示
            if let Some(window) = app.get_webview_window("permission") {
                let _ = window.show();
                let _ = window.set_focus();
            } else {
                warn!("辅助功能提示窗口创建失败且窗口不存在");
            }
        }
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// 供前端调用：检查辅助功能权限，并同步全局状态。
/// 当前前端未调用，保留给设置页展示授权状态等场景使用。
#[tauri::command]
pub fn check_accessibility_permission(
    state: State<AccessibilityState>,
) -> Result<bool, String> {
    let granted = ensure_accessibility_permission()?;
    state.set_granted(granted);
    Ok(granted)
}

/// 划词翻译主入口：剪贴板方案（macOS/Win/Linux 通用）
#[tauri::command]
pub async fn translate_selection(
    app: tauri::AppHandle,
    state: State<'_, AccessibilityState>,
) -> Result<String, String> {
    if !state.is_granted() {
        // 用户可能已在系统设置中完成授权，每次触发时向系统重新确认并回写全局变量
        let granted = ensure_accessibility_permission()?;
        state.set_granted(granted);
        if !granted {
            show_permission_window(&app);
            return Err(PERMISSION_DENIED_MSG.to_string());
        }
    }

    // macOS：优先用 AX API 直接读取选中文本，不经过剪贴板，也不打扰目标应用
    #[cfg(target_os = "macos")]
    {
        match get_selected_text_ax() {
            Ok(text) if !text.trim().is_empty() => {
                info!("selected(ax)=>{}", text);
                show_and_focus_main(&app);
                return Ok(text);
            }
            Ok(_) => {}
            Err(e) => info!("ax 读取选中文本失败，回退剪贴板方案: {}", e),
        }
    }

    let original = app.clipboard().read_text().unwrap_or_default();
    info!("original=>{}", original);

    // macOS 的 simulate_copy 需要 app/state 做权限兜底；其他平台用 enigo 版本
    #[cfg(target_os = "macos")]
    simulate_copy(&app, &state)?;
    #[cfg(not(target_os = "macos"))]
    simulate_copy()?;

    let selected = poll_changed(
        || app.clipboard().read_text().unwrap_or_default(),
        &original,
        Duration::from_millis(200),
        Duration::from_millis(5),
    );
    info!("selected=>{}", selected);

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
