import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'tdee_app_settings_store'
const ACTIVITY_LEVELS = ['very_low', 'low', 'moderate', 'high', 'very_high']

const DEFAULT_SUGGESTIONS_VISIBLE_COLUMNS = {
    name: true,
    amount: true,
    calories: true,
    usePer100g: true,
    caloriesPer100g: true,
    tags: true,
    notes: true
}

function sanitizeSuggestionsVisibleColumns(value) {
    const source = value && typeof value === 'object' ? value : {}
    const result = {}
    const keys = Object.keys(DEFAULT_SUGGESTIONS_VISIBLE_COLUMNS)
    for (const key of keys) {
        result[key] = source[key] === undefined
            ? DEFAULT_SUGGESTIONS_VISIBLE_COLUMNS[key]
            : Boolean(source[key])
    }
    if (!Object.values(result).some(Boolean)) {
        result.name = true
    }
    return result
}

function sanitizeAppSettings(value) {
    const source = value && typeof value === 'object' ? value : {}
    const tdeeManualBias = Number(source.tdeeManualBias)
    const startupActivityEnabled = Boolean(source.startupActivityEnabled)
    const startupActivityLevel = ACTIVITY_LEVELS.includes(source.startupActivityLevel)
        ? source.startupActivityLevel
        : 'low'
    return {
        suggestionsVisibleColumns: sanitizeSuggestionsVisibleColumns(source.suggestionsVisibleColumns),
        tdeeManualBias: Number.isFinite(tdeeManualBias)
            ? Math.max(0, Math.min(1, Math.round(tdeeManualBias * 100) / 100))
            : 0,
        startupActivityEnabled,
        startupActivityLevel
    }
}

export const useAppSettingsStore = defineStore('appSettings', () => {
    const appSettings = ref(sanitizeAppSettings({}))

    function setAppSettings(value) {
        appSettings.value = sanitizeAppSettings(value)
    }

    function setSuggestionsVisibleColumns(value) {
        appSettings.value = {
            ...appSettings.value,
            suggestionsVisibleColumns: sanitizeSuggestionsVisibleColumns(value)
        }
    }

    function setTdeeManualBias(value) {
        const numeric = Number(value)
        const sanitized = Number.isFinite(numeric)
            ? Math.max(0, Math.min(1, Math.round(numeric * 100) / 100))
            : 0
        appSettings.value = {
            ...appSettings.value,
            tdeeManualBias: sanitized
        }
    }

    function setStartupActivityEnabled(value) {
        appSettings.value = {
            ...appSettings.value,
            startupActivityEnabled: Boolean(value)
        }
    }

    function setStartupActivityLevel(value) {
        appSettings.value = {
            ...appSettings.value,
            startupActivityLevel: ACTIVITY_LEVELS.includes(value) ? value : 'low'
        }
    }

    function resetAppSettings() {
        appSettings.value = sanitizeAppSettings({})
    }

    if (localStorage.getItem(STORAGE_KEY)) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
        if (stored) {
            appSettings.value = sanitizeAppSettings(stored)
        }
    }

    watch([appSettings], () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appSettings.value))
    }, { deep: true })

    return {
        appSettings,
        sanitizeAppSettings,
        sanitizeSuggestionsVisibleColumns,
        setAppSettings,
        setSuggestionsVisibleColumns,
        setTdeeManualBias,
        setStartupActivityEnabled,
        setStartupActivityLevel,
        resetAppSettings
    }
})
