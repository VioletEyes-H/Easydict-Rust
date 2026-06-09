<template>
  <div class="settings-sub-page">
    <div class="card-container">
      <div class="card-header">全局快捷键</div>
      <a-card :body-style="{padding:'12px'}">
        <div class="form-item">
          <div>输入翻译</div>
          <a-input
              size="small"
              style="width: 140px"
              :value="displayShortcuts.inputTranslate"
              :placeholder="recordingName === 'inputTranslate' ? '请按下快捷键...' : '点击录制快捷键'"
              :class="{ recording: recordingName === 'inputTranslate' }"
              @focus="startRecording('inputTranslate', $event)"
              @blur="stopRecording"
              readonly>
            <template #suffix>
              <CloseCircleFilled v-if="displayShortcuts.inputTranslate && recordingName === 'inputTranslate'"
                                 class="clear-icon"
                                 style="font-size: 10px"
                                 @mousedown.prevent="clearShortcuts('inputTranslate')"/>
            </template>
          </a-input>
        </div>
        <a-divider style="margin: 8px 0"/>
        <div class="form-item">
          <div>截图翻译</div>
          <a-input size="small" style="width: 140px" placeholder="暂未实现" disabled/>
        </div>
        <a-divider style="margin: 8px 0"/>
        <div class="form-item">
          <div>划词翻译</div>
          <a-input size="small" style="width: 140px" placeholder="暂未实现" disabled/>
        </div>
      </a-card>
    </div>

    <div class="card-container">
      <div class="card-header">应用内快捷键</div>
      <a-card :body-style="{padding:'12px'}">
        <div class="form-item">
          <div>清空查询内容</div>
          <a-input size="small" style="width: 140px" placeholder="暂未实现" disabled/>
        </div>
        <a-divider style="margin: 8px 0"/>
        <div class="form-item">
          <div>播放发音</div>
          <a-input size="small" style="width: 140px" placeholder="暂未实现" disabled/>
        </div>
        <a-divider style="margin: 8px 0"/>
        <div class="form-item">
          <div>重试</div>
          <a-input size="small" style="width: 140px" placeholder="暂未实现" disabled/>
        </div>
        <a-divider style="margin: 8px 0"/>
        <div class="form-item">
          <div>钉住窗口</div>
          <a-input size="small" style="width: 140px" placeholder="暂未实现" disabled/>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import {computed, ref} from "vue";
import {CloseCircleFilled} from "@ant-design/icons-vue";
import {useShortcutsStore} from "@/stores/shortcuts";

const store = useShortcutsStore();
const recordingName = ref(null);

const displayShortcuts = computed(() => ({
  inputTranslate: store.shortcuts.inputTranslate ? store.toDisplay(store.shortcuts.inputTranslate) : "",
}));

function startRecording(name, event) {
  recordingName.value = name;
  event.target.addEventListener("keydown", onKeyDown, true);
}

function stopRecording(event) {
  event.target.removeEventListener("keydown", onKeyDown, true);
  recordingName.value = null;
}

const isMac = /mac/i.test(navigator.userAgent);

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

function onKeyDown(e) {
  e.preventDefault();
  e.stopPropagation();

  // Esc 取消录制（不清除已有快捷键）
  if (e.key === "Escape") {
    e.target.blur();
    return;
  }

  // 忽略单独按修饰键
  if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;

  const parts = [];

  // macOS 上 Meta 键 (Command) 映射为 CmdOrCtrl
  // Windows/Linux 上 Ctrl 键映射为 CmdOrCtrl
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

  store.updateShortcut(recordingName.value, parts.join("+"));
  recordingName.value = null;
  e.target.blur();
}

const clearShortcuts = (name) => {
  store.updateShortcut(name, "");
}
</script>

<style scoped>
.settings-sub-page {
  width: 600px;
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-header {
  padding-left: 8px;
  font-weight: 600;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recording {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 2px var(--color-primary-bg) !important;
}

.clear-icon {
  color: var(--color-text-tertiary);
}

.clear-icon:hover {
  color: var(--color-text-secondary);
}
</style>
