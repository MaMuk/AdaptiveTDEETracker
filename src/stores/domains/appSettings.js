import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { resolveSetupCompleted } from '../../utils/setupCompletion'

const STORAGE_KEY = 'tdee_app_settings_store'
const ACTIVITY_LEVELS = ['very_low', 'low', 'moderate', 'high', 'very_high']
const MEASUREMENT_SYSTEMS = ['metric', 'imperial']
const METRIC_UNITS = ['g', 'ml', 'serving']
const IMPERIAL_UNITS = ['oz', 'fl oz', 'serving']
const METRIC_UNIT_MULTIPLIERS = { g: 100, ml: 100, serving: 1 }
const IMPERIAL_UNIT_MULTIPLIERS = { oz: 100, 'fl oz': 100, serving: 1 }

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

function sanitizeMeasurementUnits(value, fallback = METRIC_UNITS) {
    const source = Array.isArray(value) ? value : []
    const units = [...new Set(source
        .map(unit => String(unit || '').trim().toLowerCase())
        .filter(Boolean))]
    if (units.length === 0) return [...fallback]
    return units
}

function sanitizeUnitMultipliers(value, fallbackMap) {
    const source = value && typeof value === 'object' ? value : {}
    const out = {}
    const keys = Object.keys(fallbackMap)
    for (const key of keys) {
        const raw = Number(source[key])
        out[key] = Number.isFinite(raw) && raw > 0 ? raw : fallbackMap[key]
    }
    return out
}

function sanitizeAppSettings(value) {
    const source = value && typeof value === 'object' ? value : {}
    const tdeeManualBias = Number(source.tdeeManualBias)
    const startupActivityEnabled = Boolean(source.startupActivityEnabled)
    const startupActivityLevel = ACTIVITY_LEVELS.includes(source.startupActivityLevel)
        ? source.startupActivityLevel
        : 'low'
    const setupCompleted = resolveSetupCompleted(source)
    const guidedTourCompleted = Boolean(source.guidedTourCompleted)
    const disclaimerAccepted = Boolean(source.disclaimerAccepted)
    const measurementSystem = MEASUREMENT_SYSTEMS.includes(source.measurementSystem)
        ? source.measurementSystem
        : 'metric'
    const unitFallback = measurementSystem === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS
    const multiplierFallback = measurementSystem === 'imperial' ? IMPERIAL_UNIT_MULTIPLIERS : METRIC_UNIT_MULTIPLIERS
    const measurementUnits = sanitizeMeasurementUnits(source.measurementUnits, unitFallback)
    const measurementUnitMultipliers = sanitizeUnitMultipliers(source.measurementUnitMultipliers, multiplierFallback)
    return {
        suggestionsVisibleColumns: sanitizeSuggestionsVisibleColumns(source.suggestionsVisibleColumns),
        tdeeManualBias: Number.isFinite(tdeeManualBias)
            ? Math.max(0, Math.min(1, Math.round(tdeeManualBias * 100) / 100))
            : 0,
        startupActivityEnabled,
        startupActivityLevel,
        setupCompleted,
        guidedTourCompleted,
        disclaimerAccepted,
        measurementSystem,
        measurementUnits,
        measurementUnitMultipliers
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

    function setSetupCompleted(value) {
        appSettings.value = {
            ...appSettings.value,
            setupCompleted: Boolean(value)
        }
    }

    function setGuidedTourCompleted(value) {
        appSettings.value = {
            ...appSettings.value,
            guidedTourCompleted: Boolean(value)
        }
    }

    function setDisclaimerAccepted(value) {
        appSettings.value = {
            ...appSettings.value,
            disclaimerAccepted: Boolean(value)
        }
    }

    function setMeasurementSystem(value) {
        const nextSystem = MEASUREMENT_SYSTEMS.includes(value) ? value : 'metric'
        const fallbackUnits = nextSystem === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS
        appSettings.value = {
            ...appSettings.value,
            measurementSystem: nextSystem,
            measurementUnits: sanitizeMeasurementUnits(appSettings.value.measurementUnits, fallbackUnits)
        }
    }

    function setMeasurementUnits(value) {
        const fallbackUnits = appSettings.value.measurementSystem === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS
        appSettings.value = {
            ...appSettings.value,
            measurementUnits: sanitizeMeasurementUnits(value, fallbackUnits)
        }
    }

    function setMeasurementUnitMultipliers(value) {
        const fallbackMap = appSettings.value.measurementSystem === 'imperial' ? IMPERIAL_UNIT_MULTIPLIERS : METRIC_UNIT_MULTIPLIERS
        appSettings.value = {
            ...appSettings.value,
            measurementUnitMultipliers: sanitizeUnitMultipliers(value, fallbackMap)
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
        setSetupCompleted,
        setGuidedTourCompleted,
        setDisclaimerAccepted,
        setMeasurementSystem,
        setMeasurementUnits,
        setMeasurementUnitMultipliers,
        resetAppSettings
    }
})
