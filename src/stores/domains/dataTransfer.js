import { defineStore } from 'pinia'
import { estimateInitialTDEE } from '../../utils/tdee'
import { useProfileLogsTdeeStore } from './profileLogsTdee'
import { useDiaryStore } from './diary'
import { useSuggestionsStore } from './suggestions'
import { useAiSettingsStore } from './aiSettings'
import { useAppSettingsStore } from './appSettings'

const EXPORT_SCHEMA_VERSION = 4
const EXPORT_SECTION_KEYS = ['profile', 'logs', 'foodDiary', 'foodSuggestions', 'appSettings']

export const useDataTransferStore = defineStore('dataTransfer', () => {
    const profileStore = useProfileLogsTdeeStore()
    const diaryStore = useDiaryStore()
    const suggestionsStore = useSuggestionsStore()
    const aiStore = useAiSettingsStore()
    const appSettingsStore = useAppSettingsStore()

    function buildExportPayload(sections = EXPORT_SECTION_KEYS) {
        const selected = Array.isArray(sections) && sections.length > 0
            ? sections.filter((key, index, arr) => EXPORT_SECTION_KEYS.includes(key) && arr.indexOf(key) === index)
            : [...EXPORT_SECTION_KEYS]
        const payload = {
            app: 'tdee-mobileapp',
            schemaVersion: EXPORT_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            sections: {}
        }
        if (selected.includes('profile')) {
            payload.sections.profile = {
                startWeight: profileStore.startWeight,
                goalWeight: profileStore.goalWeight,
                height: profileStore.height,
                age: profileStore.age,
                sex: profileStore.sex,
                weeklyRate: profileStore.weeklyRate,
                baselineTDEE: profileStore.baselineTDEE,
                aiMealRecognitionEnabled: aiStore.aiMealRecognitionEnabled,
                openAiApiKey: aiStore.openAiApiKey
            }
        }
        if (selected.includes('logs')) {
            payload.sections.logs = {
                logs: Array.isArray(profileStore.logs) ? [...profileStore.logs] : [],
                tdeeSnapshotsByDate: profileStore.tdeeSnapshotsByDate && typeof profileStore.tdeeSnapshotsByDate === 'object'
                    ? { ...profileStore.tdeeSnapshotsByDate }
                    : {}
            }
        }
        if (selected.includes('foodDiary')) {
            payload.sections.foodDiary = {
                foodDiaryEnabled: Boolean(diaryStore.foodDiaryEnabled),
                diarySections: Array.isArray(diaryStore.diarySections) ? [...diaryStore.diarySections] : ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
                diarySectionPercentages: { ...(diaryStore.diarySectionPercentages || {}) },
                foodDiaryEntries: Array.isArray(diaryStore.foodDiaryEntries) ? [...diaryStore.foodDiaryEntries] : [],
                diaryClosedSectionsByDate: { ...(diaryStore.diaryClosedSectionsByDate || {}) },
                diaryBudgetSnapshotsByDate: { ...(diaryStore.diaryBudgetSnapshotsByDate || {}) }
            }
        }
        if (selected.includes('foodSuggestions')) {
            payload.sections.foodSuggestions = {
                foodSuggestions: Array.isArray(suggestionsStore.foodSuggestions) ? [...suggestionsStore.foodSuggestions] : []
            }
        }
        if (selected.includes('appSettings')) {
            payload.sections.appSettings = {
                appSettings: appSettingsStore.sanitizeAppSettings(appSettingsStore.appSettings)
            }
        }
        return payload
    }

    function importFromPayload(payload, sections = EXPORT_SECTION_KEYS) {
        if (!payload || typeof payload !== 'object') return { importedSections: [] }
        const sourceSections = payload.sections && typeof payload.sections === 'object' ? payload.sections : payload
        const selected = Array.isArray(sections) && sections.length > 0
            ? sections.filter((key, index, arr) => EXPORT_SECTION_KEYS.includes(key) && arr.indexOf(key) === index)
            : [...EXPORT_SECTION_KEYS]
        const importedSections = []

        if (selected.includes('profile') && sourceSections.profile && typeof sourceSections.profile === 'object') {
            profileStore.startWeight = sourceSections.profile.startWeight ?? null
            profileStore.goalWeight = sourceSections.profile.goalWeight ?? null
            profileStore.height = sourceSections.profile.height ?? null
            profileStore.age = sourceSections.profile.age ?? null
            profileStore.sex = sourceSections.profile.sex === 'female' ? 'female' : 'male'
            profileStore.weeklyRate = sourceSections.profile.weeklyRate ?? 0.5
            profileStore.baselineTDEE = sourceSections.profile.baselineTDEE
                ?? sourceSections.profile.calculatedTDEE
                ?? (profileStore.startWeight ? estimateInitialTDEE(profileStore.startWeight) : estimateInitialTDEE(70))
            aiStore.setAiMealRecognitionEnabled(sourceSections.profile.aiMealRecognitionEnabled)
            aiStore.setOpenAiApiKey(sourceSections.profile.openAiApiKey)
            importedSections.push('profile')
        }

        if (selected.includes('logs') && sourceSections.logs && typeof sourceSections.logs === 'object') {
            profileStore.logs = Array.isArray(sourceSections.logs.logs) ? [...sourceSections.logs.logs] : []
            profileStore.tdeeSnapshotsByDate = profileStore.sanitizeTdeeSnapshots(sourceSections.logs.tdeeSnapshotsByDate)
            importedSections.push('logs')
        }

        if (selected.includes('foodDiary') && sourceSections.foodDiary && typeof sourceSections.foodDiary === 'object') {
            diaryStore.foodDiaryEnabled = Boolean(sourceSections.foodDiary.foodDiaryEnabled)
            diaryStore.diarySections = Array.isArray(sourceSections.foodDiary.diarySections) && sourceSections.foodDiary.diarySections.length > 0
                ? [...new Set(sourceSections.foodDiary.diarySections.map(section => String(section || '').trim()).filter(Boolean))]
                : ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
            diaryStore.foodDiaryEntries = Array.isArray(sourceSections.foodDiary.foodDiaryEntries) ? [...sourceSections.foodDiary.foodDiaryEntries] : []
            const legacySections = diaryStore.getLegacyDiarySections(diaryStore.foodDiaryEntries, diaryStore.diarySections)
            diaryStore.diarySectionPercentages = diaryStore.sanitizeSectionPercentages(sourceSections.foodDiary.diarySectionPercentages, diaryStore.diarySections, legacySections)
            diaryStore.diaryClosedSectionsByDate = diaryStore.sanitizeClosedSectionsByDate(sourceSections.foodDiary.diaryClosedSectionsByDate, diaryStore.diarySections, legacySections)
            diaryStore.diaryBudgetSnapshotsByDate = diaryStore.sanitizeDiaryBudgetSnapshots(sourceSections.foodDiary.diaryBudgetSnapshotsByDate, diaryStore.diarySections, legacySections)
            importedSections.push('foodDiary')
        }

        if (selected.includes('foodSuggestions') && sourceSections.foodSuggestions && typeof sourceSections.foodSuggestions === 'object') {
            suggestionsStore.foodSuggestions = suggestionsStore.normalizeSuggestions(sourceSections.foodSuggestions.foodSuggestions)
            importedSections.push('foodSuggestions')
        }
        if (selected.includes('appSettings') && sourceSections.appSettings && typeof sourceSections.appSettings === 'object') {
            const incoming = sourceSections.appSettings.appSettings && typeof sourceSections.appSettings.appSettings === 'object'
                ? sourceSections.appSettings.appSettings
                : sourceSections.appSettings
            appSettingsStore.setAppSettings(incoming)
            importedSections.push('appSettings')
        }

        if (importedSections.includes('logs') && !importedSections.includes('profile') && !Number.isFinite(Number(profileStore.baselineTDEE))) {
            profileStore.baselineTDEE = profileStore.startWeight ? estimateInitialTDEE(profileStore.startWeight) : estimateInitialTDEE(70)
        }
        profileStore.updateTDEE()

        return { importedSections }
    }

    return {
        buildExportPayload,
        importFromPayload,
        exportSectionKeys: EXPORT_SECTION_KEYS
    }
})
