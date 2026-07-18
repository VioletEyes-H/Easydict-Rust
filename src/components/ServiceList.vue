<template>
  <a-collapse class="service-list"
              :bordered="false"
              expandIconPosition="end"
              :ghost="true"
              :activeKey="activeKeys"
              @change="onCollapseChange">
    <a-collapse-panel v-for="service in services" :key="service.id" :force-render="true">
      <template #header>
        <div class="service-header">
          <div v-if="service.icon && service.icon.includes('<svg')" class="service-icon-svg" v-html="service.icon"/>
          <span v-else-if="service.icon" class="service-icon-emoji">{{ service.icon }}</span>
          <InfoCircleOutlined v-else/>
          <span class="service-name">{{ service.name }}</span>
          <span v-if="service.tag" class="service-tag">{{ service.tag }}</span>
          <a-spin size="small" v-if="loading[service.id]"/>
        </div>
      </template>
      <component :is="service.component"
                 type="view"
                 :id="service.id"
                 :config="service.config"
                 :input="input"
                 :sourceLang="sourceLang"
                 :targetLang="targetLang"/>
    </a-collapse-panel>
  </a-collapse>
</template>

<script setup>
import {ref, computed, watch, provide} from "vue";
import {InfoCircleOutlined} from "@ant-design/icons-vue";
import {useServicesStore} from "@/stores/services";
import {useTranslateStore} from "@/stores/translate";
import {storeToRefs} from "pinia";

const props = defineProps({
  input: {type: String, default: ""},
});

const translateStore = useTranslateStore();
const {sourceLang, targetLang, isExpanded} = storeToRefs(translateStore);

const servicesStore = useServicesStore();

const services = computed(() => {
  const services = servicesStore.services
  return services.filter(e => e.enabled)
})

const activeKeys = ref([]);
const loading = ref({})

provide('onServiceComplete', (serviceId) => {
  const expanded = new Set(activeKeys.value)
  if (!expanded.has(serviceId)) {
    expanded.add(serviceId)
    activeKeys.value = [...expanded]
  }
  loading.value[serviceId] = false
})

watch(isExpanded, (expanded) => {
  activeKeys.value = []
  services.value.forEach(service => {
    loading.value[service.id] = expanded && !!props.input
  })
})

function onCollapseChange(keys) {
  if (props.input) {
    activeKeys.value = keys
  }
}
</script>

<style scoped>
.service-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.ant-collapse-item) {
  border: none;
  border-radius: 10px;
  background-color: var(--color-hover-light);
  margin-bottom: 0;
  overflow: hidden;
}

:deep(.ant-collapse-item:last-child) {
  border-radius: 10px;
}

:deep(.ant-collapse-header) {
  padding: 4px 12px !important;
  align-items: center !important;
}

.service-header {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary);
}

.service-icon-svg {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-icon-svg :deep(svg) {
  width: 100%;
  height: 100%;
}

.service-icon-emoji {
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-name {
  font-size: 14px;
  color: var(--color-text-primary);
}

.service-tag {
  font-size: 8px;
  color: var(--color-text-tertiary);
  background-color: var(--color-hover-light);
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
