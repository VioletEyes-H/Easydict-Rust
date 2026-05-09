<template>
  <service-base v-bind="$props">
    <template #config>
      <div class="custom-config">
        <a-form layout="vertical" :style="{gap: '8px'}">
          <a-form-item label="服务名称">
            <a-input v-model:value="form.name" placeholder="输入服务名称" @change="save"/>
          </a-form-item>
          <a-form-item label="图标">
            <a-input v-model:value="form.icon" placeholder="输入 emoji 图标" @change="save"/>
          </a-form-item>
          <a-form-item label="颜色">
            <div class="color-row">
              <input type="color" v-model="form.color" @input="save" class="color-picker"/>
              <a-input v-model:value="form.color" placeholder="#000000" @change="save"/>
            </div>
          </a-form-item>
        </a-form>
      </div>
    </template>
  </service-base>
</template>

<script setup>
import {reactive, watch} from 'vue'
import ServiceBase from './ServiceBase.vue'
import {useServicesStore} from '@/stores/services.js'

const props = defineProps({
  type: {type: String, required: true},
  id: {type: String, required: true},
  serviceId: {type: String, default: ''},
  config: {type: Object, default: () => ({})},
  input: {type: String, default: ''},
  sourceLang: {type: String, default: 'auto'},
  targetLang: {type: String, default: 'zh'},
})

const servicesStore = useServicesStore()

const form = reactive({
  name: props.config.name || '',
  icon: props.config.icon || '',
  color: props.config.color || '#1677ff',
})

watch(() => props.config, (newConfig) => {
  form.name = newConfig.name || ''
  form.icon = newConfig.icon || ''
  form.color = newConfig.color || '#1677ff'
}, {immediate: true})

function save() {
  servicesStore.set(props.id, {
    config: {
      ...props.config,
      name: form.name,
      icon: form.icon,
      color: form.color,
    }
  })
}

function removeService(id) {
  delete servicesStore.data[id]
  localStorage.setItem('services', JSON.stringify(servicesStore.data))
  if (selectedId.value === id) {
    selectedId.value = services.value[0]?.id ?? null
  }
}
</script>

<style scoped>
.custom-config {
  padding: 8px 0;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker {
  width: 32px;
  height: 32px;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 4px;
}
</style>
