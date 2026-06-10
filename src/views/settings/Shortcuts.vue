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
                                 @mousedown.prevent="clearShortcut('inputTranslate')"/>
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
        <template v-for="(item, index) in appItems" :key="item.name">
          <a-divider v-if="index > 0" style="margin: 8px 0"/>
          <div class="form-item">
            <div>{{ item.label }}</div>
            <a-input
                size="small"
                style="width: 140px"
                :value="displayShortcuts[item.name]"
                :placeholder="recordingName === item.name ? '请按下快捷键...' : '点击录制快捷键'"
                :class="{ recording: recordingName === item.name }"
                @focus="startRecording(item.name, $event)"
                @blur="stopRecording"
                readonly>
              <template #suffix>
                <CloseCircleFilled v-if="displayShortcuts[item.name] && recordingName === item.name"
                                   class="clear-icon"
                                   style="font-size: 10px"
                                   @mousedown.prevent="clearShortcut(item.name)"/>
              </template>
            </a-input>
          </div>
        </template>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import {computed, ref} from "vue";
import {message} from "ant-design-vue";
import {CloseCircleFilled} from "@ant-design/icons-vue";
import {useShortcutsStore} from "@/stores/shortcuts";
import {useAppShortcutsStore} from "@/stores/appShortcuts";
import {buildAccelerator, hasModifier, sameAccelerator, toDisplay} from "@/utils/accelerator";

const store = useShortcutsStore();
const appStore = useAppShortcutsStore();
const recordingName = ref(null);

const appItems = [
  {name: "clearInput", label: "清空查询内容"},
  {name: "playTTS", label: "播放发音"},
  {name: "retry", label: "重试"},
  {name: "pinWindow", label: "钉住窗口"},
];

// 全局快捷键名集合，用于区分写入哪个 store
const GLOBAL_NAMES = new Set(["inputTranslate"]);

const displayShortcuts = computed(() => {
  const result = {};
  result.inputTranslate = toDisplay(store.shortcuts.inputTranslate);
  for (const {name} of appItems) {
    result[name] = toDisplay(appStore.shortcuts[name]);
  }
  return result;
});

function startRecording(name, event) {
  recordingName.value = name;
  event.target.addEventListener("keydown", onKeyDown, true);
}

function stopRecording(event) {
  event.target.removeEventListener("keydown", onKeyDown, true);
  recordingName.value = null;
}

// 收集除当前录制项外的所有已设置快捷键，用于冲突检测
function collectOthers(currentName) {
  const all = {...store.shortcuts, ...appStore.shortcuts};
  delete all[currentName];
  return all;
}

function commit(name, accelerator) {
  if (GLOBAL_NAMES.has(name)) {
    store.updateShortcut(name, accelerator);
  } else {
    appStore.updateShortcut(name, accelerator);
  }
}

function onKeyDown(e) {
  e.preventDefault();
  e.stopPropagation();

  // Esc 取消录制（不清除已有快捷键）
  if (e.key === "Escape") {
    e.target.blur();
    return;
  }

  const accelerator = buildAccelerator(e);
  // 仅按下修饰键，继续等待主键
  if (!accelerator) return;

  // 必须包含修饰键
  if (!hasModifier(accelerator)) {
    message.warning("快捷键需包含 Ctrl / Cmd / Alt 等修饰键");
    return;
  }

  // 与其他已设置项（应用内或全局）冲突时拒绝
  const others = collectOthers(recordingName.value);
  const conflict = Object.values(others).some((v) => sameAccelerator(v, accelerator));
  if (conflict) {
    message.error("该快捷键已被占用");
    return;
  }

  commit(recordingName.value, accelerator);
  e.target.blur();
}

const clearShortcut = (name) => {
  commit(name, "");
};
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
