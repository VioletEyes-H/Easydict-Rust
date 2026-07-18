<template>
  <a-select :value="language"
            :bordered="false"
            :get-popup-container="()=>container"
            class="select"
            :dropdownStyle="{display:'flex',flexDirection:'column',  justifyContent:'start'}"
            @change="handleChange">
    <a-select-option v-for="item in langOptions" :value="item.value">
      <div class="lang-option">
        <GlobalOutlined v-if="item.flag === 'auto'" style="font-size: 14px"/>
        <div v-else class="flag-icon" v-html="getFlagSvg(item.flag)"/>
        {{ item.label }}
      </div>
    </a-select-option>
  </a-select>
</template>

<script setup>
import {computed} from "vue";
import {LANGUAGES, getFlagSvg, getLangFlag} from "@/constants/lang.js";
import {GlobalOutlined} from "@ant-design/icons-vue";

const props = defineProps({
  language: String, // 当前语言
  auto: {
    type: String,
    default: ''
  },
  container: {
    type: Object,
    default: () => document.body
  },
  autoText:{
    type: String,
    default: '自动检测'
  }
});

const emit = defineEmits(["update:language", "change"]);

const handleChange = (value) => {
  emit("update:language", value)
  emit("change", value);
};

const langOptions = computed(() => {
  const languages = LANGUAGES.map(l => ({value: l.code, label: l.name, flag: l.flag}));
  if (props.auto) {
    const flag = props.auto === 'auto' ? 'auto' : getLangFlag(props.auto)
    return [{value: "auto", label: props.autoText, flag}, ...languages]
  }
  return languages
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

.ant-select-item-option-content .lang-option{
  display: flex;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.ant-select-selection-item .lang-option {
  display: flex;
  align-items: center;
  text-align: center;
  justify-content: center;
  gap: 8px;
}

.flag-icon {
  display: inline-flex;
  width: 16px;
  height: 12px;
  overflow: hidden;
  border-radius: 2px;
}
</style>
