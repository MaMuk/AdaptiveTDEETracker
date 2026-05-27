const APP_SETTINGS_STORAGE_KEY = 'tdee_app_settings_store'
const PROFILE_STORAGE_KEY = 'tdee_profile_logs_tdee_store'

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
    if (value === null || value === undefined) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return Number.isFinite(Number(value))
}

export function hasLegacySetupData() {
    const profile = readJsonFromStorage(PROFILE_STORAGE_KEY)
    if (profile) {
        if (hasFiniteNumber(profile.startWeight) || hasFiniteNumber(profile.goalWeight) || hasFiniteNumber(profile.height)) {
            return true
        }
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
