export const isMac = /mac/i.test(navigator.userAgent);

// 特殊按键映射为 accelerator 格式
const KEY_MAP = {
  Enter: "Return",
  Escape: "Escape",
  Backspace: "Backspace",
  Delete: "Delete",
  Tab: "Tab",
  Space: "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

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

const MODIFIER_KEYS = new Set([
  "CmdOrCtrl",
  "CommandOrControl",
  "Cmd",
  "Command",
  "Super",
  "Meta",
  "Ctrl",
  "Control",
  "Shift",
  "Alt",
  "Option",
]);

// 从键盘事件构建 accelerator 字符串，仅按下修饰键时返回 null
export function buildAccelerator(e) {
  if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return null;

  const parts = [];

  // macOS 上 Meta (Command) 映射为 CmdOrCtrl；Windows/Linux 上 Ctrl 映射为 CmdOrCtrl
  if (isMac) {
    if (e.metaKey) parts.push("CmdOrCtrl");
    if (e.ctrlKey) parts.push("Ctrl");
  } else {
    if (e.ctrlKey) parts.push("CmdOrCtrl");
  }

  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");

  let key;
  if (KEY_MAP[e.key]) {
    key = KEY_MAP[e.key];
  } else if (e.key.length === 1) {
    key = e.key.toUpperCase();
  } else {
    key = e.code.replace("Key", "").replace("Digit", "");
  }
  parts.push(key);

  return parts.join("+");
}

// 判断 accelerator 是否包含至少一个修饰键
export function hasModifier(accelerator) {
  if (!accelerator) return false;
  return accelerator.split("+").some((part) => MODIFIER_KEYS.has(part));
}

// 符号化显示，例如 "CmdOrCtrl+Shift+T" -> "⌘ + ⇧ + T"
export function toDisplay(accelerator) {
  if (!accelerator) return "";
  return accelerator
    .split("+")
    .map((part) => MODIFIER_DISPLAY[part] || part)
    .join(" + ");
}

// 归一化后比较两个 accelerator 是否等价（用于冲突检测）
export function sameAccelerator(a, b) {
  if (!a || !b) return false;
  const normalize = (acc) => acc.split("+").sort().join("+").toUpperCase();
  return normalize(a) === normalize(b);
}
