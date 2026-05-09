import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
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
    }

    function remove(serviceId) {
        delete data.value[serviceId]
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.value))
    }

    const services = computed(() => {
        return Object.values(data.value).map(entry => ({
            ...serviceTemplates[entry.templateId],
            ...entry
        }))
    })

    return {data, services, get, set, remove}
})
