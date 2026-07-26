import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import {emit, listen} from '@tauri-apps/api/event'
import {serviceTemplates, defaultServices} from '@/views/services'

const STORAGE_KEY = 'services'

export const useServicesStore = defineStore('services', () => {
    const data = ref(load())

    function load() {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                return JSON.parse(stored)
            } catch {
                // fall through
            }
        }
        const defaults = {}
        defaultServices.forEach(s => {
            defaults[s.id] = s
        })
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
        return defaults
    }

    function get(serviceId) {
        return data.value[serviceId] || {}
    }

    function set(serviceId, value) {
        data.value[serviceId] = {...data.value[serviceId], ...value}
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.value))
        emit('services-changed', {id: serviceId, value})
    }

    function remove(serviceId) {
        delete data.value[serviceId]
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.value))
        emit('services-changed', {id: serviceId, removed: true})
    }

    const services = computed(() => {
        return Object.values(data.value).map(entry => ({
            ...serviceTemplates[entry.templateId],
            ...entry
        }))
    })

    // 监听其他窗口的服务变更，按 key 合并以保持原有顺序
    listen('services-changed', (event) => {
        const {id, value, removed} = event.payload
        if (removed) {
            delete data.value[id]
        } else {
            data.value[id] = {...data.value[id], ...value}
        }
    })

    return {data, services, get, set, remove}
})
