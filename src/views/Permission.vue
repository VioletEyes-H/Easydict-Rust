<template>
  <div class="permission-page" :style="pageStyle">
    <SafetyCertificateOutlined class="perm-icon" />

    <h1 class="title">需要辅助功能权限</h1>

    <p class="desc">
      划词翻译需要读取选中文本，请在「系统设置 → 辅助功能」中授权本应用。
    </p>

    <div class="actions">
      <button type="button" class="btn btn-secondary" @click="closeWindow">
        稍后
      </button>
      <button type="button" class="btn btn-primary" @click="goToSettings">
        去设置
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SafetyCertificateOutlined } from "@ant-design/icons-vue";
import { themes } from "../styles/themes/tokens";

// 本窗口颜色独立跟随 macOS 系统日夜模式，不跟随应用内主题设置
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const isDark = ref(darkQuery.matches);

function onSystemSchemeChange(event) {
  isDark.value = event.matches;
}

darkQuery.addEventListener("change", onSystemSchemeChange);
onUnmounted(() => darkQuery.removeEventListener("change", onSystemSchemeChange));

// 局部内联 CSS 变量优先级高于 documentElement，覆盖应用主题
const pageStyle = computed(() => themes[isDark.value ? "dark" : "light"].css);

async function goToSettings() {
  try {
    await openUrl(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    );
  } catch (e) {
    console.error("打开系统设置失败:", e);
  }
  closeWindow();
}

function closeWindow() {
  getCurrentWindow().close().catch((e) => console.error("关闭窗口失败:", e));
}
</script>

<style scoped>
.permission-page {
  /* macOS system colours — native-fidelity tokens, scoped to this alert */
  --macos-blue: #007aff;
  --macos-blue-hover: #0071e3;
  --macos-blue-active: #0062cc;
  --macos-focus-ring: rgba(0, 122, 255, 0.35);

  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 14px 24px 16px;
  overflow: hidden;
  background: var(--color-bg-primary);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", sans-serif;
  text-align: center;
  -webkit-font-smoothing: antialiased;
}

.perm-icon {
  font-size: 44px;
  line-height: 1;
  color: var(--macos-blue);
}

.title {
  width: 100%;
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.desc {
  width: 100%;
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-text-secondary);
}

.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
}

.btn {
  box-sizing: border-box;
  min-width: 64px;
  height: 28px;
  padding: 0 16px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1;
  cursor: default;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.btn:focus-visible {
  outline: 3px solid var(--macos-focus-ring);
  outline-offset: 1px;
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.btn-secondary:hover {
  background: var(--color-hover);
}

.btn-secondary:active {
  background: var(--color-hover-light);
}

.btn-primary {
  background: var(--macos-blue);
  border: 1px solid transparent;
  color: #ffffff;
  font-weight: 500;
}

.btn-primary:hover {
  background: var(--macos-blue-hover);
}

.btn-primary:active {
  background: var(--macos-blue-active);
}
</style>
