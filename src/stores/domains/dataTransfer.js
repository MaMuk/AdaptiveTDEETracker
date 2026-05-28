import { defineStore } from 'pinia'
import { estimateInitialTDEE } from '../../utils/tdee'
import { useProfileLogsTdeeStore } from './profileLogsTdee'
import { useDiaryStore } from './diary'
import { useSuggestionsStore } from './suggestions'
import { useAiSettingsStore } from './aiSettings'
import { useAppSettingsStore } from './appSettings'

const EXPORT_SCHEMA_VERSION = 6
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
            const normalizedEntries = (Array.isArray(diaryStore.foodDiaryEntries) ? diaryStore.foodDiaryEntries : []).map((entry) => ({
                id: entry.id,
                date: entry.date,
                name: entry.name,
                amount: entry.amount || '',
                calories: Number(entry.calories),
                section: entry.section || '',
                densityMode: entry.densityMode === 'per100' ? 'per100' : 'none',
                densityBasis: entry.densityBasis === 'volume' ? 'volume' : 'mass',
                densityKcalPer100Canonical: Number.isFinite(Number(entry.densityKcalPer100Canonical))
                    ? Number(entry.densityKcalPer100Canonical)
                    : null
            }))
            payload.sections.foodDiary = {
                foodDiaryEnabled: Boolean(diaryStore.foodDiaryEnabled),
                diarySections: Array.isArray(diaryStore.diarySections) ? [...diaryStore.diarySections] : ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
                diarySectionPercentages: { ...(diaryStore.diarySectionPercentages || {}) },
                foodDiaryEntries: normalizedEntries,
                diaryClosedSectionsByDate: { ...(diaryStore.diaryClosedSectionsByDate || {}) },
                diaryBudgetSnapshotsByDate: { ...(diaryStore.diaryBudgetSnapshotsByDate || {}) }
            }
        }
        if (selected.includes('foodSuggestions')) {
            const normalizedSuggestions = (Array.isArray(suggestionsStore.foodSuggestions) ? suggestionsStore.foodSuggestions : []).map((item) => ({
                ...item,
                densityMode: item.densityMode === 'per100' ? 'per100' : 'none',
                densityBasis: item.densityBasis === 'volume' ? 'volume' : 'mass',
                densityKcalPer100Canonical: Number.isFinite(Number(item.densityKcalPer100Canonical))
                    ? Number(item.densityKcalPer100Canonical)
                    : null,
                usePer100g: undefined,
                caloriesPer100g: undefined
            }))
            payload.sections.foodSuggestions = {
                foodSuggestions: normalizedSuggestions
            }
        }
        if (selected.includes('appSettings')) {
            const sanitized = appSettingsStore.sanitizeAppSettings(appSettingsStore.appSettings)
            const { disclaimerAccepted: _disclaimerAccepted, ...exportableAppSettings } = sanitized
            payload.sections.appSettings = {
                appSettings: exportableAppSettings
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
            appSettingsStore.setDisclaimerAccepted(false)
            importedSections.push('appSettings')
        }

        if (importedSections.includes('logs') && !importedSections.includes('profile') && !Number.isFinite(Number(profileStore.baselineTDEE))) {
            profileStore.baselineTDEE = profileStore.startWeight ? estimateInitialTDEE(profileStore.startWeight) : estimateInitialTDEE(70)
        }
        if (importedSections.length > 0) {
            appSettingsStore.setSetupCompleted(true)
            appSettingsStore.setDisclaimerAccepted(false)
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
