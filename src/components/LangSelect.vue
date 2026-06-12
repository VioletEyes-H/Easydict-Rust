<template>
  <a-select v-model:value="selected"
            :options="langOptions"
            :bordered="false"
            :filterOption="filterOption"
            :dropdownMatchSelectWidth="false"
            :get-popup-container="()=>container"
            class="select"
            @change="handleChange">
  </a-select>
</template>

<script setup>
import {computed} from "vue";
import {LANGUAGES} from "@/constants/lang.js";

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

const filterOption = (input, option) => {
  return option.label.toLowerCase().includes(input.toLowerCase());
};

const ALL_LANGUAGES = LANGUAGES
    .filter(l => l.code !== 'auto')
    .map(l => ({value: l.code, label: `${l.flag} ${l.name}`, flag: l.flag}));

const langOptions = computed(() => {
  if (props.auto) {
    // 根据检测到的语言动态生成 auto 选项的图标
    const detectedFlag = props.detectedLang
        ? ALL_LANGUAGES.find(l => l.value === props.detectedLang)?.flag || '🌐'
        : '🌐';
    const auto = [{value: "auto", label: `${detectedFlag} 自动检测`, flag: detectedFlag}]
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
</style>