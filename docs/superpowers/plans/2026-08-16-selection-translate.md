# 划词翻译 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 用户在任意应用选中文字后按下全局快捷键，翻译窗口弹出并自动填入选中文本并触发翻译；划词读取逻辑全部封装在后端单个 `translate_selection` 命令中。

**架构：** 后端新增 `selection.rs` 模块，`translate_selection` 命令同步完成「读剪贴板 → 模拟复制（macOS 用 objc2 CGEvent / Win+Linux 用 enigo 0.2）→ 5ms 内容差异轮询 → 恢复剪贴板 → 显示窗口 → 返回文本」；前端 `shortcuts.js` 新增可自定义的 `translateSelection` 快捷键，回调里 `invoke` 一次拿到文本后填入并翻译。

**技术栈：** Rust + Tauri v2、`tauri-plugin-clipboard-manager` v2、`enigo` 0.2（非 macOS）、`objc2-core-graphics` 0.3（macOS）、Vue 3 + Pinia。

**已核实的第三方 API（实现时直接照用，勿再猜）：**

- `app.clipboard().read_text()` 返回 `Result<String, Error>`（剪贴板为空/非文本时返回 **`Err`**，不是 `Ok("")`），故用 `unwrap_or_default()` 兜底。
- `app.clipboard().write_text(text)` 返回 `Result<()>`，参数 `T: Into<Cow<str>>`，传 `&str` 即可。
- `read_text()`/`write_text()` **不能在主线程调用**（Linux 会死锁）→ `translate_selection` 必须是**同步** `#[tauri::command]`（Tauri v2 同步命令跑在单独线程，安全），禁止写成 `async fn`。
- enigo 0.2：`Enigo::new(&Settings::default())` 返回 `Result<Enigo, NewConError>`；`Keyboard` trait（非 `KeyboardControllable`）；字符键是 `Key::Unicode('c')`（0.1 的 `Key::Layout` 已重命名，写了编译失败）；`Direction::{Press, Click, Release}`。
- objc2-core-graphics 0.3：`CGEvent::new_keyboard_event(None, keycode, key_down) -> Option<CFRetained<CGEvent>>`；`CGEvent::set_flags(Some(&event), flags)`；`CGEvent::post(CGEventTapLocation::HIDEventTap, Some(&event))`；`CGEventFlags::MaskCommand`（bitflags）；`CGKeyCode = u16`，字母 `c` 的虚拟键码为 `8`（kVK_ANSI_C）。默认 feature 已含 `CGEvent`/`CGEventTypes`/`CGRemoteOperation`，无需额外 feature。`CFRetained<CGEvent>` 实现 `Deref<Target=CGEvent>`，`&key_down` 可自动 coerce 为 `&CGEvent`。

---

### 任务 1：新增 Cargo.toml 依赖

**文件：**
- 修改：`src-tauri/Cargo.toml`

- [ ] **步骤 1：在 `[dependencies]` 末尾追加通用依赖 `tauri-plugin-clipboard-manager`**

`src-tauri/Cargo.toml` 当前 `[dependencies]` 段（第 20-29 行）追加一行，最终变为：

```toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api", "tray-icon"] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = "0.3"
reqwest = { version = "0.12", features = ["json"] }
rodio = "0.19"
tauri-plugin-global-shortcut = "2"
tauri-plugin-clipboard-manager = "2"
```

- [ ] **步骤 2：在文件末尾追加平台相关依赖**

在 `Cargo.toml` 末尾（`[dependencies]` 段之后）追加：

```toml
[target.'cfg(not(target_os = "macos"))'.dependencies]
enigo = "0.2"

[target.'cfg(target_os = "macos")'.dependencies]
objc2-core-graphics = "0.3"
```

> 说明：`objc2-core-graphics` 0.3 与项目 Cargo.lock 已存在的 objc2 0.6.4 兼容；enigo 0.2 默认 feature `xdo`（Linux X11 运行时需 `xdotool`）。

- [ ] **步骤 3：验证依赖解析**

运行（在 `src-tauri` 目录）：

```bash
cargo check
```

预期：下载 enigo / clipboard-manager 依赖并编译通过（此时尚未新增任何代码，仅依赖解析），exit code 0。

- [ ] **步骤 4：Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "feat(selection): 添加剪贴板与模拟按键依赖"
```

---

### 任务 2：实现 `poll_changed` 纯函数（TDD）

**文件：**
- 创建：`src-tauri/src/selection.rs`
- 修改：`src-tauri/src/lib.rs`（加 `mod selection;`）

- [ ] **步骤 1：创建 `selection.rs`，先写失败的测试**

`src-tauri/src/selection.rs` 内容：

```rust
use std::thread;
use std::time::{Duration, Instant};

/// 以固定间隔轮询，直到 `read()` 返回值 ≠ `original`，返回变化后的内容；
/// 超过 `deadline` 未变化则返回空字符串。
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
```

在 `src-tauri/src/lib.rs` 顶部（第 1 行 `mod http;` 附近）加：

```rust
mod http;
mod selection;
mod shortcut;
```

- [ ] **步骤 2：运行测试确认失败**

运行（在 `src-tauri` 目录）：

```bash
cargo test poll_changed
```

预期：编译失败，报错 `cannot find function poll_changed in this scope`（因为 `poll_changed` 尚未实现——实际是「空实现待补」的占位；本步骤目的是先跑通测试框架）。若 `poll_changed` 尚未写实现体，编译器报 `poll_changed` 未找到，据此进入步骤 3。

> 注：本任务「先测试后实现」的物理顺序——步骤 1 已同时给出 `poll_changed` 实现与测试。若严格遵循 TDD，可先只写测试（函数体留 `unimplemented!()`），运行确认测试 panic，再补实现。两者等价，选择其一即可。

- [ ] **步骤 3：确认实现使测试通过**

运行：

```bash
cargo test poll_changed
```

预期：2 个测试 PASS（`returns_changed_content_immediately`、`returns_empty_on_timeout`）。此时会有 `dead_code` 警告（`poll_changed` 尚未被生产代码调用），任务 3 会消除，可接受。

- [ ] **步骤 4：Commit**

```bash
git add src-tauri/src/selection.rs src-tauri/src/lib.rs
git commit -m "test(selection): 添加剪贴板轮询纯函数及单元测试"
```

---

### 任务 3：实现 `translate_selection` 命令与跨平台模拟按键

**文件：**
- 修改：`src-tauri/src/selection.rs`（补全完整模块）

- [ ] **步骤 1：用以下完整内容替换 `selection.rs`**

```rust
use std::thread;
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tracing::warn;

/// 以固定间隔轮询，直到 `read()` 返回值 ≠ `original`，返回变化后的内容；
/// 超过 `deadline` 未变化则返回空字符串。
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

/// 模拟 Cmd+C（macOS）或 Ctrl+C（Windows/Linux），将选中文本写入剪贴板。
#[cfg(target_os = "macos")]
fn simulate_copy() -> Result<(), String> {
    use objc2_core_graphics::{CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode};

    // kVK_ANSI_C = 8
    const KEYCODE_C: CGKeyCode = 8;

    let key_down = CGEvent::new_keyboard_event(None, KEYCODE_C, true)
        .ok_or_else(|| "创建键盘按下事件失败".to_string())?;
    CGEvent::set_flags(Some(&key_down), CGEventFlags::MaskCommand);
    CGEvent::post(CGEventTapLocation::HIDEventTap, Some(&key_down));

    let key_up = CGEvent::new_keyboard_event(None, KEYCODE_C, false)
        .ok_or_else(|| "创建键盘抬起事件失败".to_string())?;
    CGEvent::set_flags(Some(&key_up), CGEventFlags::MaskCommand);
    CGEvent::post(CGEventTapLocation::HIDEventTap, Some(&key_up));

    Ok(())
}

/// 模拟 Ctrl+C（Windows/Linux）。
#[cfg(not(target_os = "macos"))]
fn simulate_copy() -> Result<(), String> {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo.key(Key::Control, Direction::Press).map_err(|e| e.to_string())?;
    enigo.key(Key::Unicode('c'), Direction::Click).map_err(|e| e.to_string())?;
    enigo.key(Key::Control, Direction::Release).map_err(|e| e.to_string())?;
    Ok(())
}

/// 无条件显示并聚焦主窗口（非 toggle）。
fn show_and_focus_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 划词翻译入口：保存剪贴板 → 模拟复制 → 轮询 → 恢复 → 显示窗口 → 返回选中文本。
///
/// 必须是同步 command（在单独线程执行，避免剪贴板操作在 Linux 主线程死锁）。
#[tauri::command]
pub fn translate_selection(app: tauri::AppHandle) -> Result<String, String> {
    // ① 保存原始剪贴板文本（空/非文本 → 空串）
    let original = app.clipboard().read_text().unwrap_or_default();

    // ② 模拟复制（失败即 Err）
    simulate_copy()?;

    // ③ 5ms 轮询，内容一旦 ≠ original 即取 selected（200ms 上限）
    let selected = poll_changed(
        || app.clipboard().read_text().unwrap_or_default(),
        &original,
        Duration::from_millis(200),
        Duration::from_millis(5),
    );

    // ④ 恢复（original 非空时才写回）
    if !original.is_empty() {
        if let Err(e) = app.clipboard().write_text(original.as_str()) {
            warn!("恢复剪贴板失败: {}", e);
        }
    }

    // ⑤ 无条件显示并聚焦主窗口
    show_and_focus_main(&app);

    // ⑥ 返回选中文本
    Ok(selected)
}

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
```

- [ ] **步骤 2：验证编译（本机 macOS 会编译 macos 分支）**

运行（在 `src-tauri` 目录）：

```bash
cargo check
```

预期：exit code 0，无错误。`dead_code` 警告此时消除（`poll_changed`/`simulate_copy` 已被 `translate_selection` 调用；`translate_selection` 尚未注册到 handler，会有「函数未被使用」的警告，任务 4 消除）。

- [ ] **步骤 3：跑测试确认无回归**

```bash
cargo test poll_changed
```

预期：2 个测试 PASS。

- [ ] **步骤 4：Commit**

```bash
git add src-tauri/src/selection.rs
git commit -m "feat(selection): 实现划词翻译后端命令与跨平台模拟复制"
```

---

### 任务 4：注册插件与命令

**文件：**
- 修改：`src-tauri/src/lib.rs`

- [ ] **步骤 1：注册 clipboard-manager 插件**

在 `run()` 中 `.plugin(tauri_plugin_opener::init())`（第 39 行）之后、`.plugin(shortcut::create_plugin())`（第 40 行）之前，插入：

```rust
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(shortcut::create_plugin())
```

- [ ] **步骤 2：在 `invoke_handler` 注册 `translate_selection`**

在 `invoke_handler` 的 `generate_handler!` 列表末尾（第 104-111 行的 `http::play_audio_stream,` 之后）加一项：

```rust
        .invoke_handler(tauri::generate_handler![
            log_message,
            show_main_window,
            http::http_get,
            http::http_post,
            http::play_system_tts,
            http::play_audio_stream,
            selection::translate_selection,
        ])
```

- [ ] **步骤 3：验证编译**

```bash
cargo check
```

预期：exit code 0，`translate_selection` 未被使用的警告消除。

- [ ] **步骤 4：Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(selection): 注册 clipboard 插件与 translate_selection 命令"
```

---

### 任务 5：前端新增可自定义快捷键项与 action

**文件：**
- 修改：`src/stores/shortcuts.js`

- [ ] **步骤 1：`DEFAULT_SHORTCUTS` 新增 `translateSelection`**

`src/stores/shortcuts.js` 第 10-12 行的常量改为：

```js
const DEFAULT_SHORTCUTS = {
  inputTranslate: "CmdOrCtrl+Shift+T",
  translateSelection: "Alt+T",
};
```

- [ ] **步骤 2：顶部导入 `useTranslateStore`**

在 `import { toDisplay } from "@/utils/accelerator";`（第 7 行）之后加：

```js
import { useTranslateStore } from "./translate";
```

- [ ] **步骤 3：`handleShortcutAction` 新增 `translateSelection` 分支**

将 `handleShortcutAction`（第 38-50 行）改为：

```js
  function handleShortcutAction(name) {
    switch (name) {
      case "inputTranslate":
        // 触发显示/隐藏主窗口
        invoke("show_main_window").catch(() => {
          console.log("Triggering input translate");
        });
        break;
      case "translateSelection":
        // 划词翻译：后端单命令封装「读剪贴板→模拟复制→轮询→恢复→显示窗口」，
        // 前端只需 invoke 一次拿到选中文本，填入并触发翻译。
        invoke("translate_selection")
          .then((text) => {
            const trimmed = text?.trim();
            if (trimmed) {
              const translateStore = useTranslateStore();
              translateStore.setInputText(trimmed);
              translateStore.submitTranslate();
            }
          })
          .catch((e) => console.error("划词翻译失败:", e));
        break;
      default:
        console.warn(`Unknown shortcut action: ${name}`);
    }
  }
```

- [ ] **步骤 4：前端语法自检**

运行（项目根目录）：

```bash
yarn build
```

预期：Vite 构建成功（无语法错误）。若报 `useTranslateStore` 循环依赖警告可忽略（Pinia store 互相引用是项目既有模式，见 `translate.js` 引 `useServicesStore`）。

- [ ] **步骤 5：Commit**

```bash
git add src/stores/shortcuts.js
git commit -m "feat(shortcuts): 添加划词翻译快捷键与前端调用"
```

---

### 任务 6：激活设置页「划词翻译」配置项

**文件：**
- 修改：`src/views/settings/Shortcuts.vue`

- [ ] **步骤 1：`GLOBAL_NAMES` 加入 `translateSelection`**

第 88 行 `const GLOBAL_NAMES = new Set(["inputTranslate"]);` 改为：

```js
const GLOBAL_NAMES = new Set(["inputTranslate", "translateSelection"]);
```

- [ ] **步骤 2：`displayShortcuts` 加入 `translateSelection`**

第 90-97 行 computed 内，在 `result.inputTranslate = ...` 之后加一行：

```js
  result.translateSelection = toDisplay(store.shortcuts.translateSelection);
```

即：

```js
const displayShortcuts = computed(() => {
  const result = {};
  result.inputTranslate = toDisplay(store.shortcuts.inputTranslate);
  result.translateSelection = toDisplay(store.shortcuts.translateSelection);
  for (const {name} of appItems) {
    result[name] = toDisplay(appStore.shortcuts[name]);
  }
  return result;
});
```

- [ ] **步骤 3：把「划词翻译」占位 input 改成可录制项**

将模板中第 30-34 行的「划词翻译」块：

```html
        <a-divider style="margin: 8px 0"/>
        <div class="form-item">
          <div>划词翻译</div>
          <a-input size="small" style="width: 140px" placeholder="暂未实现" disabled/>
        </div>
```

替换为与「输入翻译」一致的录制结构：

```html
        <a-divider style="margin: 8px 0"/>
        <div class="form-item">
          <div>划词翻译</div>
          <a-input
              size="small"
              style="width: 140px"
              :value="displayShortcuts.translateSelection"
              :placeholder="recordingName === 'translateSelection' ? '请按下快捷键...' : '点击录制快捷键'"
              :class="{ recording: recordingName === 'translateSelection' }"
              @focus="startRecording('translateSelection', $event)"
              @blur="stopRecording"
              readonly>
            <template #suffix>
              <CloseCircleFilled v-if="displayShortcuts.translateSelection && recordingName === 'translateSelection'"
                                 class="clear-icon"
                                 style="font-size: 10px"
                                 @mousedown.prevent="clearShortcut('translateSelection')"/>
            </template>
          </a-input>
        </div>
```

- [ ] **步骤 4：前端构建自检**

```bash
yarn build
```

预期：构建成功。

- [ ] **步骤 5：Commit**

```bash
git add src/views/settings/Shortcuts.vue
git commit -m "feat(shortcuts): 激活设置页划词翻译快捷键配置"
```

---

### 任务 7：端到端手动验证（三平台）

**文件：** 无代码改动，纯验证。

- [ ] **步骤 1：macOS 验证（当前开发机）**

运行 `yarn tauri dev`，然后：
1. 在任意编辑器/浏览器选中一段文字。
2. 按 `⌥ + T`（`Alt+T` 默认键位）。
3. 预期：首次会弹「辅助功能」权限申请，在「系统设置 → 隐私与安全性 → 辅助功能」勾选本 App 后重试。
4. 预期：主窗口弹出，输入框自动填入选中文字并触发翻译；剪贴板恢复原内容。
5. 边界：不选中任何文字按 `⌥+T` → 窗口仍弹出但输入框为空（或按 `CmdOrCtrl+Shift+T` 切换窗口）。

- [ ] **步骤 2：验证快捷键自定义**

打开「设置 → 快捷键」，点击「划词翻译」录制一个自定义组合键（如 `⌘+Shift+Q`），确认保存后在任意应用按新键位可触发划词翻译；与「输入翻译」键位冲突时会弹「该快捷键已被占用」。

- [ ] **步骤 3：Windows / Linux 验证**

在对应平台 `yarn tauri dev` 后重复步骤 1：
- Windows：`Ctrl+Alt+T`（`Alt+T` 映射）模拟 `Ctrl+C`，一般无需额外权限。
- Linux X11：需系统已安装 `xdotool`（enigo 默认 feature）；Wayland/GNOME 下模拟按键受限，属已知限制（记录到 README，不阻塞本计划）。

- [ ] **步骤 4：确认无回归后收尾**

运行 `cargo test` 与 `yarn build` 全绿后，本功能完成。无需额外 commit（如无代码改动）；若步骤 3 补充了 README 说明，单独 commit：`docs: 补充划词翻译平台限制说明`。

---

## 自检结论（对照规格）

- **覆盖度**：规格 §5/§6/§7/§8 由任务 1-4 覆盖（命令行为、跨平台模拟、错误处理、窗口语义）；§3.2/§4 前端部分由任务 5-6 覆盖；§9 测试由任务 2 单测 + 任务 7 手动验证覆盖；§10 实施顺序与本计划任务顺序一致。无遗漏。
- **类型一致性**：`poll_changed` 签名在任务 2/3 一致；`translate_selection` 返回 `Result<String, String>` 与前端 `invoke(...).then(text => ...)` 一致；`translateSelection` 键名在 `shortcuts.js`/`Shortcuts.vue`/`GLOBAL_NAMES` 三处一致。
- **占位符**：无「TODO/待定/补充」；所有代码步骤含完整代码。
