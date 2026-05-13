import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useSuggestionsStore } from './suggestions'

const STORAGE_KEY = 'tdee_diary_store'
const DEFAULT_SECTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

export const useDiaryStore = defineStore('diary', () => {
    const foodDiaryEnabled = ref(false)
    const diarySections = ref([...DEFAULT_SECTIONS])
    const diarySectionPercentages = ref({})
    const foodDiaryEntries = ref([])
    const diaryClosedSectionsByDate = ref({})
    const diaryBudgetSnapshotsByDate = ref({})

    const suggestionsStore = useSuggestionsStore()

    function defaultSectionPercentages(sections) {
        const normalizedSections = Array.isArray(sections) && sections.length > 0 ? sections : DEFAULT_SECTIONS
        const keys = ['__unsectioned__', ...normalizedSections]
        const perSection = 100 / keys.length
        const out = {}
        let used = 0
        for (let i = 0; i < keys.length; i += 1) {
            const value = i === keys.length - 1 ? Math.max(0, 100 - used) : Math.round(perSection)
            out[keys[i]] = value
            used += value
        }
        return out
    }

    function getLegacyDiarySections(entries, sections, date = null) {
        const configured = new Set(Array.isArray(sections) ? sections : [])
        const legacy = new Set()
        for (const entry of (Array.isArray(entries) ? entries : [])) {
            if (date && entry?.date !== date) continue
            const key = String(entry?.section || '').trim()
            if (!key || configured.has(key)) continue
            legacy.add(key)
        }
        return [...legacy].sort((a, b) => a.localeCompare(b))
    }

    function getAllKnownDiarySections(entries = foodDiaryEntries.value, sections = diarySections.value) {
        return [...(Array.isArray(sections) ? sections : []), ...getLegacyDiarySections(entries, sections)]
    }

    function getDiarySectionsForDate(date) {
        return [...(Array.isArray(diarySections.value) ? diarySections.value : []), ...getLegacyDiarySections(foodDiaryEntries.value, diarySections.value, date)]
    }

    function sanitizeSectionPercentages(rawPercentages, sections, extraSections = []) {
        const sectionList = Array.isArray(sections) && sections.length > 0 ? sections : DEFAULT_SECTIONS
        const legacySections = Array.isArray(extraSections)
            ? [...new Set(extraSections.map(section => String(section || '').trim()).filter(Boolean).filter(section => !sectionList.includes(section)))]
            : []
        const keys = ['__unsectioned__', ...sectionList, ...legacySections]
        const defaults = defaultSectionPercentages(sectionList)
        const sanitized = {}
        for (const key of keys) {
            const rawValue = Number(rawPercentages?.[key])
            if (Number.isFinite(rawValue) && rawValue >= 0) {
                sanitized[key] = rawValue
                continue
            }
            sanitized[key] = key in defaults ? defaults[key] : 0
        }
        return sanitized
    }

    function sanitizeClosedSectionsByDate(raw, sections, extraSections = []) {
        const validKeys = new Set(['__unsectioned__', ...(Array.isArray(sections) ? sections : []), ...(Array.isArray(extraSections) ? extraSections : [])])
        if (!raw || typeof raw !== 'object') return {}
        const out = {}
        for (const [date, values] of Object.entries(raw)) {
            if (!Array.isArray(values)) continue
            const cleaned = [...new Set(values
                .map((item) => String(item || '').trim())
                .filter((item) => validKeys.has(item)))]
            if (cleaned.length > 0) out[date] = cleaned
        }
        return out
    }

    function sanitizeDiaryBudgetSnapshots(raw, sections, extraSections = []) {
        const validKeys = ['__unsectioned__', ...(Array.isArray(sections) ? sections : []), ...(Array.isArray(extraSections) ? extraSections : [])]
        if (!raw || typeof raw !== 'object') return {}
        const out = {}
        for (const [date, snapshot] of Object.entries(raw)) {
            if (!snapshot || typeof snapshot !== 'object') continue
            const calculatedTDEEValue = Number(snapshot.calculatedTDEE)
            const weeklyRateValue = Number(snapshot.weeklyRate)
            const totalDailyBudgetValue = Number(snapshot.totalDailyBudget)
            const sectionPercentagesRaw = snapshot.sectionPercentages && typeof snapshot.sectionPercentages === 'object' ? snapshot.sectionPercentages : {}
            const sectionPercentages = {}
            for (const key of validKeys) {
                const rawValue = Number(sectionPercentagesRaw[key])
                if (Number.isFinite(rawValue) && rawValue >= 0) sectionPercentages[key] = rawValue
            }
            out[date] = {
                calculatedTDEE: Number.isFinite(calculatedTDEEValue) ? calculatedTDEEValue : null,
                weeklyRate: Number.isFinite(weeklyRateValue) ? weeklyRateValue : null,
                totalDailyBudget: Number.isFinite(totalDailyBudgetValue) && totalDailyBudgetValue >= 0 ? totalDailyBudgetValue : 0,
                sectionPercentages
            }
        }
        return out
    }

    function setFoodDiaryEnabled(enabled) {
        foodDiaryEnabled.value = Boolean(enabled)
    }

    function setDiarySections(sections) {
        const sanitized = sections
            .map(section => String(section || '').trim())
            .filter(section => section.length > 0)
        diarySections.value = sanitized.length > 0 ? [...new Set(sanitized)] : [...DEFAULT_SECTIONS]
        const legacySections = getLegacyDiarySections(foodDiaryEntries.value, diarySections.value)
        diarySectionPercentages.value = sanitizeSectionPercentages(diarySectionPercentages.value, diarySections.value, legacySections)
        diaryClosedSectionsByDate.value = sanitizeClosedSectionsByDate(diaryClosedSectionsByDate.value, diarySections.value, legacySections)
        diaryBudgetSnapshotsByDate.value = sanitizeDiaryBudgetSnapshots(diaryBudgetSnapshotsByDate.value, diarySections.value, legacySections)
    }

    function setDiarySectionPercentage(sectionKey, percentage) {
        const key = sectionKey || '__unsectioned__'
        const validKeys = new Set(['__unsectioned__', ...getAllKnownDiarySections()])
        if (!validKeys.has(key)) return
        const parsed = Number(percentage)
        if (!Number.isFinite(parsed) || parsed < 0) return
        diarySectionPercentages.value = {
            ...diarySectionPercentages.value,
            [key]: parsed
        }
    }

    function setDiaryClosedSectionsForDate(date, sections) {
        const keyDate = String(date || '').trim()
        if (!keyDate) return
        const sanitized = sanitizeClosedSectionsByDate({ [keyDate]: Array.isArray(sections) ? sections : [] }, diarySections.value, getLegacyDiarySections(foodDiaryEntries.value, diarySections.value))
        diaryClosedSectionsByDate.value = {
            ...diaryClosedSectionsByDate.value,
            [keyDate]: sanitized[keyDate] || []
        }
    }

    function toggleDiarySectionClosedForDate(date, sectionKey) {
        const keyDate = String(date || '').trim()
        if (!keyDate) return
        const key = String(sectionKey || '__unsectioned__').trim() || '__unsectioned__'
        const valid = new Set(['__unsectioned__', ...getAllKnownDiarySections()])
        if (!valid.has(key)) return
        const current = Array.isArray(diaryClosedSectionsByDate.value[keyDate]) ? [...diaryClosedSectionsByDate.value[keyDate]] : []
        const index = current.indexOf(key)
        if (index === -1) current.push(key)
        else current.splice(index, 1)
        setDiaryClosedSectionsForDate(keyDate, current)
    }

    function upsertDiaryBudgetSnapshot(date, snapshot) {
        const keyDate = String(date || '').trim()
        if (!keyDate || !snapshot || typeof snapshot !== 'object') return
        const sanitizedMap = sanitizeDiaryBudgetSnapshots({ [keyDate]: snapshot }, diarySections.value, getLegacyDiarySections(foodDiaryEntries.value, diarySections.value))
        if (!sanitizedMap[keyDate]) return
        diaryBudgetSnapshotsByDate.value = {
            ...diaryBudgetSnapshotsByDate.value,
            [keyDate]: sanitizedMap[keyDate]
        }
    }

    function addDiaryEntry(date, entry, options = {}) {
        const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const syncSuggestion = options.syncSuggestion !== false
        const normalized = {
            id,
            date,
            name: entry.name,
            amount: entry.amount || '',
            calories: Number(entry.calories),
            section: entry.section || '',
            usePer100g: Boolean(entry.usePer100g),
            caloriesPer100g: entry.caloriesPer100g !== null && entry.caloriesPer100g !== undefined
                ? Number(entry.caloriesPer100g)
                : null
        }
        foodDiaryEntries.value.push(normalized)
        if (syncSuggestion) suggestionsStore.upsertSuggestionFromEntry(normalized)
    }

    function updateDiaryEntry(id, updates, options = {}) {
        const index = foodDiaryEntries.value.findIndex(entry => entry.id === id)
        if (index === -1) return
        const syncSuggestion = options.syncSuggestion !== false
        const updated = {
            ...foodDiaryEntries.value[index],
            ...updates,
            calories: Number(updates.calories ?? foodDiaryEntries.value[index].calories),
            section: updates.section ?? foodDiaryEntries.value[index].section ?? '',
            usePer100g: Boolean(updates.usePer100g ?? foodDiaryEntries.value[index].usePer100g),
            caloriesPer100g: updates.caloriesPer100g !== undefined
                ? Number(updates.caloriesPer100g)
                : foodDiaryEntries.value[index].caloriesPer100g
        }
        foodDiaryEntries.value[index] = updated
        if (syncSuggestion) suggestionsStore.upsertSuggestionFromEntry(updated)
    }

    function deleteDiaryEntry(id) {
        const index = foodDiaryEntries.value.findIndex(entry => entry.id === id)
        if (index !== -1) foodDiaryEntries.value.splice(index, 1)
    }

    function getDiaryEntriesByDate(date) {
        return foodDiaryEntries.value
            .filter(entry => entry.date === date)
            .sort((a, b) => a.id.localeCompare(b.id))
    }

    function getDiaryEntriesByDateAndSection(date, section) {
        return getDiaryEntriesByDate(date).filter(entry => (entry.section || '') === (section || ''))
    }

    function sumDiaryCaloriesByDate(date) {
        return getDiaryEntriesByDate(date).reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0)
    }

    function sumDiaryCaloriesByDateAndSection(date, section) {
        return getDiaryEntriesByDateAndSection(date, section).reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0)
    }

    function resetDiary() {
        foodDiaryEnabled.value = false
        diarySections.value = [...DEFAULT_SECTIONS]
        diarySectionPercentages.value = defaultSectionPercentages(diarySections.value)
        foodDiaryEntries.value = []
        diaryClosedSectionsByDate.value = {}
        diaryBudgetSnapshotsByDate.value = {}
    }

    if (localStorage.getItem(STORAGE_KEY)) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
        if (stored) {
            foodDiaryEnabled.value = Boolean(stored.foodDiaryEnabled)
            diarySections.value = Array.isArray(stored.diarySections) && stored.diarySections.length > 0
                ? stored.diarySections
                : [...DEFAULT_SECTIONS]
            foodDiaryEntries.value = Array.isArray(stored.foodDiaryEntries) ? stored.foodDiaryEntries : []
            const legacySections = getLegacyDiarySections(foodDiaryEntries.value, diarySections.value)
            diarySectionPercentages.value = sanitizeSectionPercentages(stored.diarySectionPercentages, diarySections.value, legacySections)
            diaryClosedSectionsByDate.value = sanitizeClosedSectionsByDate(stored.diaryClosedSectionsByDate, diarySections.value, legacySections)
            diaryBudgetSnapshotsByDate.value = sanitizeDiaryBudgetSnapshots(stored.diaryBudgetSnapshotsByDate, diarySections.value, legacySections)
        }
    }

    if (Object.keys(diarySectionPercentages.value).length === 0) {
        diarySectionPercentages.value = defaultSectionPercentages(diarySections.value)
    }

    watch([foodDiaryEnabled, diarySections, diarySectionPercentages, foodDiaryEntries, diaryClosedSectionsByDate, diaryBudgetSnapshotsByDate], () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            foodDiaryEnabled: foodDiaryEnabled.value,
            diarySections: diarySections.value,
            diarySectionPercentages: diarySectionPercentages.value,
            foodDiaryEntries: foodDiaryEntries.value,
            diaryClosedSectionsByDate: diaryClosedSectionsByDate.value,
            diaryBudgetSnapshotsByDate: diaryBudgetSnapshotsByDate.value
        }))
    }, { deep: true })

    return {
        foodDiaryEnabled,
        diarySections,
        diarySectionPercentages,
        foodDiaryEntries,
        diaryClosedSectionsByDate,
        diaryBudgetSnapshotsByDate,
        getLegacyDiarySections,
        sanitizeSectionPercentages,
        sanitizeClosedSectionsByDate,
        sanitizeDiaryBudgetSnapshots,
        getAllKnownDiarySections,
        getDiarySectionsForDate,
        setFoodDiaryEnabled,
        setDiarySections,
        setDiarySectionPercentage,
        setDiaryClosedSectionsForDate,
        toggleDiarySectionClosedForDate,
        upsertDiaryBudgetSnapshot,
        addDiaryEntry,
        updateDiaryEntry,
        deleteDiaryEntry,
        getDiaryEntriesByDate,
        getDiaryEntriesByDateAndSection,
        sumDiaryCaloriesByDate,
        sumDiaryCaloriesByDateAndSection,
        resetDiary
    }
})
