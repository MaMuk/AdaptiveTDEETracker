import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'tdee_ai_settings_store'

export const useAiSettingsStore = defineStore('aiSettings', () => {
    const aiMealRecognitionEnabled = ref(false)
    const openAiApiKey = ref('')

    function setAiMealRecognitionEnabled(enabled) {
        aiMealRecognitionEnabled.value = Boolean(enabled)
    }

    function setOpenAiApiKey(key) {
        openAiApiKey.value = String(key || '').trim()
    }

    function resetAiSettings() {
        aiMealRecognitionEnabled.value = false
        openAiApiKey.value = ''
    }

    if (localStorage.getItem(STORAGE_KEY)) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
        if (stored) {
            aiMealRecognitionEnabled.value = Boolean(stored.aiMealRecognitionEnabled)
            openAiApiKey.value = String(stored.openAiApiKey || '')
        }
    }

    watch([aiMealRecognitionEnabled, openAiApiKey], () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            aiMealRecognitionEnabled: aiMealRecognitionEnabled.value,
            openAiApiKey: openAiApiKey.value
        }))
    }, { deep: true })

    return {
        aiMealRecognitionEnabled,
        openAiApiKey,
        setAiMealRecognitionEnabled,
        setOpenAiApiKey,
        resetAiSettings
    }
})
