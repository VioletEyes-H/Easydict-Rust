# 划词翻译设计规格

日期：2026-08-16
状态：待用户审查

## 1. 背景与目标

用户在任意应用中选中一段文字，按下全局快捷键后，翻译应用弹出并自动填入选中的内容并触发翻译。

核心约束：**划词读取逻辑全在后端（Rust）封装，前端只调用一次接口拿到选中文本**。

Tauri v2 无法直接读取其他应用中的选中内容，需借助系统剪贴板作为桥梁：模拟 `Cmd/Ctrl+C` 将选中文本写入剪贴板，再读取剪贴板得到选中文本，并在读取后立即恢复原始剪贴板内容，将覆盖窗口压缩到几十毫秒。

## 2. 需求

1. 用户在任意应用选中文字，按下全局快捷键后，主窗口弹出并自动填入选中文本并触发翻译。
2. 快捷键需**可自定义**，与现有 `inputTranslate` 一致，出现在快捷键设置页（`Shortcuts.vue`）。
3. 划词读取（保存剪贴板 → 模拟复制 → 轮询 → 恢复）与窗口显示全部封装在后端，前端只做「一次 invoke + 填文本 + 触发翻译」。
4. 跨平台：Windows / macOS / Linux。

## 3. 架构与组件

### 3.1 后端（Rust）

- 新增模块 `src-tauri/src/selection.rs`，提供唯一对外命令 `translate_selection`，内部封装整个划词读取流程。
- `src-tauri/src/lib.rs`：`mod selection;` 并在 `invoke_handler` 注册 `selection::translate_selection`。
- `Cargo.toml` 新增 target-specific 依赖：
  - `[target.'cfg(not(target_os = "macos"))'.dependencies] enigo = "0.2"`
  - `[target.'cfg(target_os = "macos")'.dependencies] objc2-core-graphics`（版本对齐 Cargo.lock 现有 objc2）

### 3.2 前端（Vue）

- `src/stores/shortcuts.js`：
  - `DEFAULT_SHORTCUTS` 新增一项 `translateSelection: "Alt+T"`（默认键位，可自定义）。
  - `handleShortcutAction` 新增 `translateSelection` 分支，调用 `invoke('translate_selection')`，拿到文本后填入并翻译。
- `src/views/settings/Shortcuts.vue`：新增「划词翻译」配置项，复用现有表单项与 `updateShortcut`。

## 4. 数据流

```
用户选中文字 → 按 translateSelection 快捷键
  → 前端 handleShortcutAction('translateSelection')
  → invoke('translate_selection')
      Rust 同步执行：
        ① 读剪贴板 original
        ② 模拟 Cmd/Ctrl+C（焦点仍在原应用）
        ③ 每 5ms 轮询，内容一旦 ≠ original 即取 selected（上限 200ms）
        ④ 恢复 original（original 非空时）
        ⑤ 无条件 show + set_focus 主窗口（非 toggle）
        ⑥ 返回 selected
  → 前端 then 回调：
      selected 非空 → setInputText(selected) + submitTranslate()
      selected 为空 → 不动作
```

关键点：模拟复制（②）与显示窗口（⑤）在同一个 Rust 同步线程内顺序执行，天然保证「先复制完再抢焦点」，避免「emit → 前端 → invoke」往返导致的焦点时序隐患。

## 5. 后端命令详细行为

```rust
// src-tauri/src/selection.rs
#[tauri::command]
pub fn translate_selection(app: tauri::AppHandle) -> Result<String, String> {
    // ① 保存原始剪贴板文本（非文本/空 → 空串）
    let original = read_text(&app);

    // ② 模拟复制（跨平台，失败即 Err）
    simulate_copy()?;

    // ③ 5ms 轮询，内容一旦 ≠ original 即取 selected（200ms 上限）
    let selected = poll_changed(&app, &original);

    // ④ 恢复（original 非空时才写回）
    if !original.is_empty() {
        let _ = write_text(&app, &original); // 失败仅 warn，不阻塞
    }

    // ⑤ 无条件显示并聚焦主窗口（非 toggle）
    show_and_focus_main(&app);

    // ⑥ 返回选中文本
    Ok(selected)
}
```

内部 helper 全部私有：

- `read_text(&app) -> String`：通过 clipboard-manager 插件读取文本，失败/非文本返回空串。
- `write_text(&app, s)`：写回剪贴板。
- `simulate_copy()`：跨平台模拟复制，见第 6 节。
- `poll_changed(&app, original) -> String`：5ms 间隔轮询，内容 ≠ original 即返回；200ms 超时返回空串。读剪贴板逻辑抽成可注入函数，便于单测。
- `show_and_focus_main(&app)`：`show()` + `set_focus()`。

## 6. 跨平台模拟按键

| 平台 | 实现 | 说明 |
|------|------|------|
| macOS | `objc2-core-graphics` 发 `CGEvent`（keycode 8 = 'c'，flag `kCGEventFlagMaskCommand`） | 需辅助功能权限；objc2 已在依赖树 |
| Windows | `enigo` 发 `Ctrl+C` | 一般无需额外权限 |
| Linux | `enigo` 发 `Ctrl+C` | X11 正常；Wayland 受限，沿用现有结论 |

`simulate_copy` 内用 `#[cfg(target_os = ...)]` 条件编译分支。

注意：enigo 使用 0.2 新 API（`Enigo::new(&Settings::default())` + `Keyboard` trait + `Direction`），不使用 0.1.x 的 `KeyboardControllable` / `key_click`。

## 7. 错误处理与边界

| 场景 | 行为 |
|------|------|
| 200ms 内剪贴板无变化 | 返回 `Ok("")`，前端不动作 |
| 选中文本 == original（极罕见） | 轮询超时返回空，用户重试 |
| original 为空（原本空/非文本） | 不写回，返回 selected |
| 恢复失败 | `warn` 日志，仍返回 selected（不阻塞翻译） |
| 模拟按键失败 | 返回 `Err`，前端 `catch` 打日志 |
| 剪贴板是图片/文件 | `read_text` 空 → 检测不到文本，超时返回空 |

返回契约：`Result<String, String>`——正常（含超时）走 `Ok`，真正的异常（模拟按键失败）走 `Err`。

## 8. 窗口显示语义

- 命令内使用「无条件 `show` + `set_focus`」，不复用现有 `show_main_window`（那是 toggle 语义，划词场景要的是「保证可见」）。
- 第一版不读鼠标坐标定位、不强制置顶（置顶已由 `pinWindow` 快捷键接管），保持 YAGNI；窗口定位留作后续扩展点。

## 9. 测试策略

- Rust：`poll_changed` 的核心是「比较 + 超时」纯逻辑，将「读剪贴板」抽成可注入闭包，覆盖「超时返回空」「内容变化立即返回」两条路径。真实剪贴板 + 全局按键无法单测，靠 `cargo check` 三平台 + 手动验证。
- 前端：手动验证「任意应用选中文字 → 按快捷键 → 窗口弹出 → 自动翻译」。

## 10. 实施顺序

1. `Cargo.toml` 新增 target-specific 依赖（enigo / objc2-core-graphics）。
2. 新增 `selection.rs`，实现 `translate_selection` 及私有 helper。
3. `lib.rs` 注册模块与命令。
4. `shortcuts.js` 新增 `translateSelection` 快捷键项与 action 分支。
5. `Shortcuts.vue` 新增「划词翻译」配置项。
6. 手动三平台验证。
