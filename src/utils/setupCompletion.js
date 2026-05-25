const APP_SETTINGS_STORAGE_KEY = 'tdee_app_settings_store'
const PROFILE_STORAGE_KEY = 'tdee_profile_logs_tdee_store'
const DIARY_STORAGE_KEY = 'tdee_diary_store'
const SUGGESTIONS_STORAGE_KEY = 'tdee_suggestions_store'
const AI_STORAGE_KEY = 'tdee_ai_settings_store'

function readJsonFromStorage(key) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

function hasFiniteNumber(value) {
    return Number.isFinite(Number(value))
}

export function hasLegacySetupData() {
    const profile = readJsonFromStorage(PROFILE_STORAGE_KEY)
    if (profile) {
        if (hasFiniteNumber(profile.startWeight) || hasFiniteNumber(profile.goalWeight) || hasFiniteNumber(profile.height)) {
            return true
        }
        if (Array.isArray(profile.logs) && profile.logs.length > 0) {
            return true
        }
    }

    const diary = readJsonFromStorage(DIARY_STORAGE_KEY)
    if (diary && Array.isArray(diary.foodDiaryEntries) && diary.foodDiaryEntries.length > 0) {
        return true
    }

    const suggestions = readJsonFromStorage(SUGGESTIONS_STORAGE_KEY)
    if (suggestions && Array.isArray(suggestions.foodSuggestions) && suggestions.foodSuggestions.length > 0) {
        return true
    }

    const ai = readJsonFromStorage(AI_STORAGE_KEY)
    if (ai && String(ai.openAiApiKey || '').trim()) {
        return true
    }

    return false
}

export function resolveSetupCompleted(source) {
    if (source && Object.prototype.hasOwnProperty.call(source, 'setupCompleted')) {
        return Boolean(source.setupCompleted)
    }
    return hasLegacySetupData()
}

export function readAppSettingsSnapshot() {
    return readJsonFromStorage(APP_SETTINGS_STORAGE_KEY)
}
