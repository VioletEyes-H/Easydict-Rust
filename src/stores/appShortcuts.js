import { defineStore } from "pinia";
import { ref } from "vue";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { buildAccelerator, sameAccelerator } from "@/utils/accelerator";

const appWindow = getCurrentWindow();

const STORAGE_KEY = "appShortcuts";
const DEFAULT_SHORTCUTS = {
  clearInput: "CmdOrCtrl+Shift+K",
  playTTS: "CmdOrCtrl+Shift+P",
  retry: "CmdOrCtrl+Shift+R",
  pinWindow: "CmdOrCtrl+Shift+D",
};

export const useAppShortcutsStore = defineStore("appShortcuts", () => {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const shortcuts = ref({ ...DEFAULT_SHORTCUTS, ...saved });

  function updateShortcut(name, value) {
    shortcuts.value[name] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts.value));
    // 广播变更，通知其他窗口（主窗口据此刷新运行时键位）
    emit("app-shortcuts-changed", shortcuts.value);
  }

  // 监听其他窗口的变更同步本窗口状态；发送方也会收到自身 emit，但 payload 与本地一致，重设无副作用
  listen("app-shortcuts-changed", (event) => {
    shortcuts.value = { ...event.payload };
  });

  // 根据键盘事件匹配动作名，未命中返回 null
  function matchAction(e) {
    const accelerator = buildAccelerator(e);
    if (!accelerator) return null;
    for (const [name, value] of Object.entries(shortcuts.value)) {
      if (value && sameAccelerator(value, accelerator)) return name;
    }
    return null;
  }

  // 钉住窗口状态（不持久化，重启重置）
  const pinned = ref(false);

  // 窗口因快捷键隐藏时，重置钉住状态
  listen("window-hidden", () => {
    pinned.value = false;
  });

  function togglePin() {
    pinned.value = !pinned.value;
    appWindow.setAlwaysOnTop(pinned.value);
  }

  return { shortcuts, updateShortcut, matchAction, pinned, togglePin };
});
