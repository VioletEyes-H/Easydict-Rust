import { defineStore } from "pinia";
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

const STORAGE_KEY = "shortcuts";
const DEFAULT_SHORTCUTS = {
  inputTranslate: "CmdOrCtrl+Shift+T",
};

const isMac = /mac/i.test(navigator.userAgent);

// 平台相关的修饰键显示映射
const MODIFIER_DISPLAY = {
  CmdOrCtrl: isMac ? "⌘" : "Ctrl",
  CommandOrControl: isMac ? "⌘" : "Ctrl",
  Cmd: isMac ? "⌘" : "Ctrl",
  Command: isMac ? "⌘" : "Ctrl",
  Super: isMac ? "⌘" : "Win",
  Meta: isMac ? "⌘" : "Win",
  Ctrl: isMac ? "⌃" : "Ctrl",
  Control: isMac ? "⌃" : "Ctrl",
  Shift: "⇧",
  Alt: isMac ? "⌥" : "Alt",
  Option: isMac ? "⌥" : "Alt",
};

function toDisplay(accelerator) {
  if (!accelerator) return "";

  const parts = accelerator.split("+");
  const displayParts = parts.map((part) => {
    // 检查是否是修饰键
    if (MODIFIER_DISPLAY[part]) {
      return MODIFIER_DISPLAY[part];
    }
    // 普通按键直接显示
    return part;
  });

  return displayParts.join(" + ");
}

// 将前端格式的快捷键转换为插件格式
function toPluginAccelerator(accelerator) {
  // 插件使用 CmdOrCtrl 作为跨平台修饰键
  // 前端使用 Meta，需要转换为 CmdOrCtrl
  return accelerator
    .replaceAll("Meta", "CmdOrCtrl")
    .replaceAll("Command", "CmdOrCtrl")
    .replaceAll("Super", "CmdOrCtrl");
}

export const useShortcutsStore = defineStore("shortcuts", () => {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const shortcuts = ref({ ...DEFAULT_SHORTCUTS, ...saved });

  // 存储当前注册的快捷键，用于取消注册
  const registeredShortcuts = ref({});

  async function updateShortcut(name, newValue) {
    const oldValue = shortcuts.value[name];

    // 先取消注册旧的快捷键
    if (oldValue && registeredShortcuts.value[name]) {
      try {
        const pluginAccelerator = toPluginAccelerator(oldValue);
        await unregister(pluginAccelerator);
        delete registeredShortcuts.value[name];
      } catch (e) {
        // 忽略取消注册错误，可能尚未注册
        console.warn("Failed to unregister old shortcut:", e);
      }
    }

    // 注册新的快捷键
    if (newValue) {
      try {
        const pluginAccelerator = toPluginAccelerator(newValue);
        await register(pluginAccelerator, (event) => {
          if (event.state === "Pressed") {
            handleShortcutAction(name);
          }
        });
        registeredShortcuts.value[name] = newValue;
      } catch (e) {
        console.error("Failed to register shortcut:", e);
        return;
      }
    }

    // 注册成功后再更新存储
    shortcuts.value[name] = newValue;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts.value));
  }

  function handleShortcutAction(name) {
    switch (name) {
      case "inputTranslate":
        // 触发显示/隐藏主窗口
        invoke("show_main_window").catch(() => {
          // 如果命令不存在，可以通过事件通知
          console.log("Triggering input translate");
        });
        break;
      default:
        console.warn(`Unknown shortcut action: ${name}`);
    }
  }

  // 初始化：并行注册所有已保存的快捷键
  async function initShortcuts() {
    const entries = Object.entries(shortcuts.value).filter(([, a]) => a);
    await Promise.allSettled(
      entries.map(async ([name, accelerator]) => {
        try {
          const pluginAccelerator = toPluginAccelerator(accelerator);
          await register(pluginAccelerator, (event) => {
            if (event.state === "Pressed") {
              handleShortcutAction(name);
            }
          });
          registeredShortcuts.value[name] = accelerator;
        } catch (e) {
          console.error(`Failed to initialize shortcut ${name}:`, e);
        }
      })
    );
  }

  // 调用初始化
  initShortcuts().catch(console.error);

  return {
    shortcuts,
    updateShortcut,
    toDisplay,
  };
});
