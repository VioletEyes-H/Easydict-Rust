<template>
  <!-- 顶部栏 -->
  <div class="top-bar" @mousedown="startDrag">
    <div class="icon-btn" v-if="isAlwaysOnTop" @click="toggleAlwaysOnTop">
      <PushpinFilled style="color: rgb(23, 126, 246)" :rotate="280"/>
    </div>
    <div class="icon-btn" v-else @click="toggleAlwaysOnTop">
      <PushpinOutlined :rotate="314"/>
    </div>
    <div class="icon-btn" @click="openSettings">
      <SettingOutlined/>
    </div>
  </div>
</template>

<script setup>
import {ref} from "vue";
import {PushpinOutlined, SettingOutlined, PushpinFilled} from "@ant-design/icons-vue";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import {SETTINGS_WINDOW_OPTIONS} from "../utils/windowConfig";

const isAlwaysOnTop = ref(false);
const SETTINGS_LABEL = "settings"

function toggleAlwaysOnTop() {
  isAlwaysOnTop.value = !isAlwaysOnTop.value;
  getCurrentWindow().setAlwaysOnTop(isAlwaysOnTop.value);
}

function startDrag(event) {
  // 阻止默认行为，防止文本选择等
  event.preventDefault();
  getCurrentWindow().startDragging();
}

async function openSettings() {
  let targetWindow = await WebviewWindow.getByLabel(SETTINGS_LABEL);
  if (targetWindow) {
    await targetWindow.show();         // 显示（如果被隐藏）
    await targetWindow.setFocus();     // 聚焦到最前
  } else {
   new WebviewWindow(SETTINGS_LABEL, SETTINGS_WINDOW_OPTIONS);
  }
}
</script>

<style scoped>
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px;
  -webkit-app-region: drag;
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--color-text-secondary);
}

.icon-btn:hover {
  background-color: var(--color-hover);
}
</style>