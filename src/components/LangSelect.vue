<template>
  <a-select v-model:value="selected"
            :bordered="false"
            :get-popup-container="()=>container"
            class="select"
            @change="handleChange">
    <a-select-option v-for="item in langOptions" :value="item.value" class="lang-option">
      <GlobalOutlined v-if="item.flag === 'auto'" />
      <div v-else class="flag-icon" v-html="getFlagSvg(item.flag)"/>
      {{ item.label }}
    </a-select-option>
  </a-select>
</template>

<script setup>
import {computed} from "vue";
import {LANGUAGES, getFlagSvg} from "@/constants/lang.js";
import {GlobalOutlined} from "@ant-design/icons-vue";

const props = defineProps({
  modelValue: String,
  detectedLang: {
    type: String,
    default: null
  },
  auto: {
    type: Boolean,
    default: false
  },
  container: {
    type: Object,
    default: () => document.body
  }
});

const emit = defineEmits(["update:modelValue", "change"]);

const selected = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val)
});

const handleChange = (value) => {
  emit("change", value);
};

const ALL_LANGUAGES = LANGUAGES
    .filter(l => l.code !== 'auto')
    .map(l => ({value: l.code, label: l.name, flag: l.flag}));

const langOptions = computed(() => {
  if (props.auto) {
    // 根据检测到的语言动态生成 auto 选项的图标
    const detectedFlag = props.detectedLang
        ? ALL_LANGUAGES.find(l => l.value === props.detectedLang)?.flag || 'auto'
        : 'auto';
    const auto = [{value: "auto", label: "自动检测", flag: detectedFlag}]
    return [...auto, ...ALL_LANGUAGES]
  }
  return ALL_LANGUAGES
})

</script>

<style scoped>
.select {
  width: 100%;
}

.select:hover {
  cursor: default;
  border-radius: 8px;
  background-color: var(--color-hover);
}

.lang-option {
  display: flex;
  align-items: center;
  text-align: center;
  justify-content: center;
  gap: 8px;
}

.flag-icon {
  display: inline-flex;
  width: 20px;
  height: 15px;
  overflow: hidden;
  border-radius: 2px;
}
</style>
