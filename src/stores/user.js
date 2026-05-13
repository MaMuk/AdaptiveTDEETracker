import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useProfileLogsTdeeStore } from './domains/profileLogsTdee'
import { useDiaryStore } from './domains/diary'
import { useSuggestionsStore } from './domains/suggestions'
import { useAiSettingsStore } from './domains/aiSettings'
import { useAppSettingsStore } from './domains/appSettings'
import { useDataTransferStore } from './domains/dataTransfer'

const LEGACY_STORAGE_KEY = 'tdee_user_store'
const PROFILE_STORAGE_KEY = 'tdee_profile_logs_tdee_store'
const DIARY_STORAGE_KEY = 'tdee_diary_store'
const SUGGESTIONS_STORAGE_KEY = 'tdee_suggestions_store'
const AI_STORAGE_KEY = 'tdee_ai_settings_store'
const APP_SETTINGS_STORAGE_KEY = 'tdee_app_settings_store'

function migrateLegacyStoreIfNeeded() {
    const hasNewStores = localStorage.getItem(PROFILE_STORAGE_KEY)
        || localStorage.getItem(DIARY_STORAGE_KEY)
        || localStorage.getItem(SUGGESTIONS_STORAGE_KEY)
        || localStorage.getItem(AI_STORAGE_KEY)
        || localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
    if (hasNewStores) return

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacyRaw) return

    let legacy
    try {
        legacy = JSON.parse(legacyRaw)
    } catch {
        return
    }
    if (!legacy || typeof legacy !== 'object') return

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
        startWeight: legacy.startWeight,
        goalWeight: legacy.goalWeight,
        height: legacy.height,
        age: legacy.age ?? null,
        sex: legacy.sex === 'female' ? 'female' : 'male',
        weeklyRate: legacy.weeklyRate,
        logs: Array.isArray(legacy.logs) ? legacy.logs : [],
        baselineTDEE: legacy.baselineTDEE || legacy.calculatedTDEE || null
    }))

    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify({
        foodDiaryEnabled: Boolean(legacy.foodDiaryEnabled),
        diarySections: Array.isArray(legacy.diarySections) && legacy.diarySections.length > 0
            ? legacy.diarySections
            : ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
        diarySectionPercentages: legacy.diarySectionPercentages || {},
        foodDiaryEntries: Array.isArray(legacy.foodDiaryEntries) ? legacy.foodDiaryEntries : [],
        diaryClosedSectionsByDate: legacy.diaryClosedSectionsByDate || {},
        diaryBudgetSnapshotsByDate: legacy.diaryBudgetSnapshotsByDate || {}
    }))

    localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify({
        foodSuggestions: Array.isArray(legacy.foodSuggestions) ? legacy.foodSuggestions : []
    }))

    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify({
        aiMealRecognitionEnabled: Boolean(legacy.aiMealRecognitionEnabled),
        openAiApiKey: String(legacy.openAiApiKey || '')
    }))

    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify({
        suggestionsVisibleColumns: legacy.suggestionsVisibleColumns || undefined
    }))
}

export const useUserStore = defineStore('user', () => {
    migrateLegacyStoreIfNeeded()

    const profileStore = useProfileLogsTdeeStore()
    const diaryStore = useDiaryStore()
    const suggestionsStore = useSuggestionsStore()
    const aiStore = useAiSettingsStore()
    const appSettingsStore = useAppSettingsStore()
    const dataTransferStore = useDataTransferStore()

    const startWeight = computed({ get: () => profileStore.startWeight, set: (v) => { profileStore.startWeight = v } })
    const goalWeight = computed({ get: () => profileStore.goalWeight, set: (v) => { profileStore.goalWeight = v } })
    const height = computed({ get: () => profileStore.height, set: (v) => { profileStore.height = v } })
    const age = computed({ get: () => profileStore.age, set: (v) => { profileStore.age = v } })
    const sex = computed({ get: () => profileStore.sex, set: (v) => { profileStore.sex = v } })
    const weeklyRate = computed({ get: () => profileStore.weeklyRate, set: (v) => { profileStore.weeklyRate = v } })
    const logs = computed({ get: () => profileStore.logs, set: (v) => { profileStore.logs = v } })
    const baselineTDEE = computed({ get: () => profileStore.baselineTDEE, set: (v) => { profileStore.baselineTDEE = v } })
    const tdeeSnapshotsByDate = computed({ get: () => profileStore.tdeeSnapshotsByDate, set: (v) => { profileStore.tdeeSnapshotsByDate = v } })
    const calculatedTDEE = computed(() => profileStore.calculatedTDEE)
    const tdeeDetails = computed(() => profileStore.tdeeDetails)
    const currentWeight = computed(() => profileStore.currentWeight)
    const averageWeight = computed(() => profileStore.averageWeight)

    const foodDiaryEnabled = computed({ get: () => diaryStore.foodDiaryEnabled, set: (v) => { diaryStore.foodDiaryEnabled = v } })
    const diarySections = computed({ get: () => diaryStore.diarySections, set: (v) => { diaryStore.diarySections = v } })
    const diarySectionPercentages = computed({ get: () => diaryStore.diarySectionPercentages, set: (v) => { diaryStore.diarySectionPercentages = v } })
    const foodDiaryEntries = computed({ get: () => diaryStore.foodDiaryEntries, set: (v) => { diaryStore.foodDiaryEntries = v } })
    const diaryClosedSectionsByDate = computed({ get: () => diaryStore.diaryClosedSectionsByDate, set: (v) => { diaryStore.diaryClosedSectionsByDate = v } })
    const diaryBudgetSnapshotsByDate = computed({ get: () => diaryStore.diaryBudgetSnapshotsByDate, set: (v) => { diaryStore.diaryBudgetSnapshotsByDate = v } })

    const foodSuggestions = computed({ get: () => suggestionsStore.foodSuggestions, set: (v) => { suggestionsStore.foodSuggestions = v } })

    const aiMealRecognitionEnabled = computed({ get: () => aiStore.aiMealRecognitionEnabled, set: (v) => { aiStore.aiMealRecognitionEnabled = v } })
    const openAiApiKey = computed({ get: () => aiStore.openAiApiKey, set: (v) => { aiStore.openAiApiKey = v } })
    const appSettings = computed({ get: () => appSettingsStore.appSettings, set: (v) => { appSettingsStore.setAppSettings(v) } })
    const suggestionsVisibleColumns = computed({
        get: () => appSettingsStore.appSettings.suggestionsVisibleColumns,
        set: (v) => { appSettingsStore.setSuggestionsVisibleColumns(v) }
    })
    const tdeeManualBias = computed({
        get: () => appSettingsStore.appSettings.tdeeManualBias,
        set: (v) => { appSettingsStore.setTdeeManualBias(v) }
    })
    const startupActivityEnabled = computed({
        get: () => appSettingsStore.appSettings.startupActivityEnabled,
        set: (v) => { appSettingsStore.setStartupActivityEnabled(v) }
    })
    const startupActivityLevel = computed({
        get: () => appSettingsStore.appSettings.startupActivityLevel,
        set: (v) => { appSettingsStore.setStartupActivityLevel(v) }
    })

    function resetAll() {
        profileStore.resetProfileLogsTdee()
        diaryStore.resetDiary()
        suggestionsStore.resetSuggestions()
        aiStore.resetAiSettings()
        appSettingsStore.resetAppSettings()
        localStorage.removeItem(LEGACY_STORAGE_KEY)
    }

    return {
        startWeight,
        currentWeight,
        averageWeight,
        goalWeight,
        height,
        age,
        sex,
        weeklyRate,
        logs,
        baselineTDEE,
        tdeeSnapshotsByDate,
        calculatedTDEE,
        tdeeDetails,
        foodDiaryEnabled,
        diarySections,
        diarySectionPercentages,
        foodDiaryEntries,
        diaryClosedSectionsByDate,
        diaryBudgetSnapshotsByDate,
        foodSuggestions,
        aiMealRecognitionEnabled,
        openAiApiKey,
        appSettings,
        suggestionsVisibleColumns,
        tdeeManualBias,
        startupActivityEnabled,
        startupActivityLevel,
        addLog: profileStore.addLog,
        deleteLog: profileStore.deleteLog,
        updateTDEE: profileStore.updateTDEE,
        resetAll,
        setFoodDiaryEnabled: diaryStore.setFoodDiaryEnabled,
        setDiarySections: diaryStore.setDiarySections,
        setDiarySectionPercentage: diaryStore.setDiarySectionPercentage,
        setDiaryClosedSectionsForDate: diaryStore.setDiaryClosedSectionsForDate,
        toggleDiarySectionClosedForDate: diaryStore.toggleDiarySectionClosedForDate,
        upsertDiaryBudgetSnapshot: diaryStore.upsertDiaryBudgetSnapshot,
        setAiMealRecognitionEnabled: aiStore.setAiMealRecognitionEnabled,
        setOpenAiApiKey: aiStore.setOpenAiApiKey,
        setAppSettings: appSettingsStore.setAppSettings,
        setSuggestionsVisibleColumns: appSettingsStore.setSuggestionsVisibleColumns,
        setTdeeManualBias: appSettingsStore.setTdeeManualBias,
        setStartupActivityEnabled: appSettingsStore.setStartupActivityEnabled,
        setStartupActivityLevel: appSettingsStore.setStartupActivityLevel,
        addDiaryEntry: diaryStore.addDiaryEntry,
        updateDiaryEntry: diaryStore.updateDiaryEntry,
        deleteDiaryEntry: diaryStore.deleteDiaryEntry,
        getDiaryEntriesByDate: diaryStore.getDiaryEntriesByDate,
        getDiaryEntriesByDateAndSection: diaryStore.getDiaryEntriesByDateAndSection,
        getDiarySectionsForDate: diaryStore.getDiarySectionsForDate,
        sumDiaryCaloriesByDate: diaryStore.sumDiaryCaloriesByDate,
        sumDiaryCaloriesByDateAndSection: diaryStore.sumDiaryCaloriesByDateAndSection,
        addSuggestion: suggestionsStore.addSuggestion,
        updateSuggestion: suggestionsStore.updateSuggestion,
        deleteSuggestion: suggestionsStore.deleteSuggestion,
        trackSuggestionLoad: suggestionsStore.trackSuggestionLoad,
        buildExportPayload: dataTransferStore.buildExportPayload,
        importFromPayload: dataTransferStore.importFromPayload,
        exportSectionKeys: dataTransferStore.exportSectionKeys
    }
})
