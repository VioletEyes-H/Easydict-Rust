import { defineStore } from "pinia";
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { toDisplay } from "@/utils/accelerator";

const STORAGE_KEY = "shortcuts";
const DEFAULT_SHORTCUTS = {
  inputTranslate: "CmdOrCtrl+Shift+T",
};

// 全局快捷键由 main 窗口单一拥有注册；settings 窗口仅改存储并广播
const isMain = getCurrentWindow().label === "main";

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

  // 改存储并广播，由 main 窗口据此重新注册（不在本窗口直接 register）
  function updateShortcut(name, value) {
    shortcuts.value[name] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts.value));
    emit("shortcuts-changed", shortcuts.value);
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

  // 幂等地将期望的快捷键应用到系统（仅 main 窗口调用）
  async function applyShortcuts(desired) {
    // 本 store 是应用内唯一的全局快捷键注册点，故可安全清空全部后整体重注册
    await unregisterAll();
    const entries = Object.entries(desired).filter(([, a]) => a);
    await Promise.allSettled(
      entries.map(async ([name, accelerator]) => {
        try {
          const pluginAccelerator = toPluginAccelerator(accelerator);
          await register(pluginAccelerator, (event) => {
            if (event.state === "Pressed") {
              handleShortcutAction(name);
            }
          });
        } catch (e) {
          console.error(`Failed to register shortcut ${name}:`, e);
        }
      })
    );
  }

  // 仅 main 窗口拥有注册：启动时应用，并监听其他窗口的变更
  if (isMain) {
    applyShortcuts(shortcuts.value).catch(console.error);
    listen("shortcuts-changed", (event) => {
      shortcuts.value = { ...event.payload };
      applyShortcuts(shortcuts.value).catch(console.error);
    });
  }

  return {
    shortcuts,
    updateShortcut,
    toDisplay,
  };
});
