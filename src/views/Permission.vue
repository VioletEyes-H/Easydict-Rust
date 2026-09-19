<template>
  <div class="permission-page">
    <p class="desc">
      划词翻译需要读取选中文本，请在「系统设置 → 辅助功能」中授权本应用。
    </p>
    <div class="actions">
      <a-button type="primary" size="small" @click="goToSettings">
        去设置
      </a-button>
      <a-button size="small" @click="closeWindow">
        稍后
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { openUrl } from "@tauri-apps/plugin-opener";
import { getCurrentWindow } from "@tauri-apps/api/window";

function goToSettings() {
  openUrl(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
  );
  closeWindow();
}

function closeWindow() {
  getCurrentWindow().close();
}
</script>

<style scoped>
.permission-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 24px;
  background: var(--color-bg, #fff);
  text-align: center;
  user-select: none;
  -webkit-user-select: none;
}

.title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary, #1f1f1f);
}

.desc {
  margin: 0 0 20px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-secondary, #595959);
}

.actions {
  display: flex;
  gap: 10px;
}
</style>
