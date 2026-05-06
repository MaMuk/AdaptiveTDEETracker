import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { calculateAdaptiveTDEE, estimateInitialTDEE } from '../utils/tdee'

export const useUserStore = defineStore('user', () => {
    // User Stats
    const startWeight = ref(null)
    const goalWeight = ref(null)
    const height = ref(null)
    const weeklyRate = ref(null) // kg per week

    // Logs: Array of { date: 'YYYY-MM-DD', weight: number, calories: number }
    const logs = ref([])
    const foodDiaryEnabled = ref(false)
    const diarySections = ref(['Breakfast', 'Lunch', 'Dinner', 'Snacks'])
    // Diary entries: { id, date, name, amount, calories, section, usePer100g, caloriesPer100g }
    const foodDiaryEntries = ref([])
    // Suggestions are independent from diary rows and survive diary row deletion.
    // { id, name, amount, calories, usePer100g, caloriesPer100g, updatedAt, usage, sectionUsage }
    const foodSuggestions = ref([])
    const aiMealRecognitionEnabled = ref(false)
    const openAiApiKey = ref('')

    // TDEE Calculation State
    const calculatedTDEE = ref(null) // Default starting point

    // Computed: Current weight from most recent log entry
    const currentWeight = computed(() => {
        if (logs.value.length === 0) return startWeight.value
        const sortedLogs = [...logs.value].sort((a, b) => new Date(b.date) - new Date(a.date))
        return sortedLogs[0].weight || startWeight.value
    })

    // Computed: Average weight over last 7 days (or fewer if not enough data)
    const averageWeight = computed(() => {
        if (logs.value.length === 0) return startWeight.value
        const sortedLogs = [...logs.value].sort((a, b) => new Date(b.date) - new Date(a.date))
        const recentLogs = sortedLogs.slice(0, 7).filter(log => log.weight)
        if (recentLogs.length === 0) return startWeight.value
        const sum = recentLogs.reduce((acc, log) => acc + log.weight, 0)
        return sum / recentLogs.length
    })


    // Load from local storage
    if (localStorage.getItem('tdee_user_store')) {
        const stored = JSON.parse(localStorage.getItem('tdee_user_store'))
        if (stored) {
            startWeight.value = stored.startWeight
            goalWeight.value = stored.goalWeight
            height.value = stored.height
            weeklyRate.value = stored.weeklyRate
            logs.value = stored.logs || []
            calculatedTDEE.value = stored.calculatedTDEE || (startWeight.value ? estimateInitialTDEE(startWeight.value) : null)
            foodDiaryEnabled.value = Boolean(stored.foodDiaryEnabled)
            diarySections.value = Array.isArray(stored.diarySections) && stored.diarySections.length > 0
                ? stored.diarySections
                : ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
            foodDiaryEntries.value = Array.isArray(stored.foodDiaryEntries) ? stored.foodDiaryEntries : []
            foodSuggestions.value = Array.isArray(stored.foodSuggestions) ? stored.foodSuggestions : []
            aiMealRecognitionEnabled.value = Boolean(stored.aiMealRecognitionEnabled)
            openAiApiKey.value = String(stored.openAiApiKey || '')
        }
    }

    // Watch and save to local storage
    watch([startWeight, goalWeight, height, weeklyRate, logs, calculatedTDEE, foodDiaryEnabled, diarySections, foodDiaryEntries, foodSuggestions, aiMealRecognitionEnabled, openAiApiKey], () => {
        // If startWeight changes and we have no logs and TDEE is default/unset, estimate it
        if (logs.value.length === 0 && startWeight.value) {
            // Only update if it seems we are in setup mode or user changed start weight
            // We can just always update it if logs are empty, assuming startWeight is the best guess
            const estimated = estimateInitialTDEE(startWeight.value)
            if (Math.abs(calculatedTDEE.value - estimated) > 100 && calculatedTDEE.value === null) {
                calculatedTDEE.value = estimated
            } else if (logs.value.length === 0) {
                // If logs are empty, keep TDEE in sync with start weight?
                // User might have manually set TDEE? No, we don't have manual TDEE setting yet.
                // So safe to update.
                calculatedTDEE.value = estimated
            }
        }

        localStorage.setItem('tdee_user_store', JSON.stringify({
            startWeight: startWeight.value,
            goalWeight: goalWeight.value,
            height: height.value,
            weeklyRate: weeklyRate.value,
            logs: logs.value,
            calculatedTDEE: calculatedTDEE.value,
            foodDiaryEnabled: foodDiaryEnabled.value,
            diarySections: diarySections.value,
            foodDiaryEntries: foodDiaryEntries.value,
            foodSuggestions: foodSuggestions.value,
            aiMealRecognitionEnabled: aiMealRecognitionEnabled.value,
            openAiApiKey: openAiApiKey.value
        }))
    }, { deep: true })

    // Actions
    function addLog(date, weight, calories) {
        const index = logs.value.findIndex(l => l.date === date)
        if (index !== -1) {
            logs.value[index] = { date, weight, calories }
        } else {
            logs.value.push({ date, weight, calories })
            // Sort logs by date
            logs.value.sort((a, b) => new Date(a.date) - new Date(b.date))
        }
        // Update current weight if it's the latest entry
        // No need to manually update currentWeight as it is now a computed property
        updateTDEE()
    }

    function updateTDEE() {
        calculatedTDEE.value = calculateAdaptiveTDEE(logs.value, calculatedTDEE.value)
    }

    function deleteLog(date) {
        const index = logs.value.findIndex(l => l.date === date)
        if (index !== -1) {
            logs.value.splice(index, 1)
            updateTDEE()
        }
    }

    function resetAll() {
        startWeight.value = null
        goalWeight.value = null
        height.value = null
        weeklyRate.value = 0.5
        logs.value = []
        calculatedTDEE.value = null
        foodDiaryEnabled.value = false
        diarySections.value = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
        foodDiaryEntries.value = []
        foodSuggestions.value = []
        aiMealRecognitionEnabled.value = false
        openAiApiKey.value = ''
        localStorage.removeItem('tdee_user_store')
    }

    function setFoodDiaryEnabled(enabled) {
        foodDiaryEnabled.value = Boolean(enabled)
    }

    function setDiarySections(sections) {
        const sanitized = sections
            .map(section => String(section || '').trim())
            .filter(section => section.length > 0)
        diarySections.value = sanitized.length > 0 ? [...new Set(sanitized)] : ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
    }

    function setAiMealRecognitionEnabled(enabled) {
        aiMealRecognitionEnabled.value = Boolean(enabled)
    }

    function setOpenAiApiKey(key) {
        openAiApiKey.value = String(key || '').trim()
    }

    function addDiaryEntry(date, entry) {
        const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
        upsertSuggestionFromEntry(normalized)
    }

    function updateDiaryEntry(id, updates) {
        const index = foodDiaryEntries.value.findIndex(entry => entry.id === id)
        if (index === -1) return
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
        upsertSuggestionFromEntry(updated)
    }

    function deleteDiaryEntry(id) {
        const index = foodDiaryEntries.value.findIndex(entry => entry.id === id)
        if (index !== -1) {
            foodDiaryEntries.value.splice(index, 1)
        }
    }

    function getDiaryEntriesByDate(date) {
        return foodDiaryEntries.value
            .filter(entry => entry.date === date)
            .sort((a, b) => a.id.localeCompare(b.id))
    }

    function getDiaryEntriesByDateAndSection(date, section) {
        return getDiaryEntriesByDate(date)
            .filter(entry => (entry.section || '') === (section || ''))
    }

    function sumDiaryCaloriesByDate(date) {
        return getDiaryEntriesByDate(date).reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0)
    }

    function sumDiaryCaloriesByDateAndSection(date, section) {
        return getDiaryEntriesByDateAndSection(date, section).reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0)
    }

    function upsertSuggestionFromEntry(entry) {
        const name = String(entry.name || '').trim()
        const caloriesValue = Number(entry.calories)
        if (!name || !Number.isFinite(caloriesValue)) return
        const existing = foodSuggestions.value.find(suggestion => suggestion.name.toLowerCase() === name.toLowerCase())
        const payload = {
            name,
            amount: entry.amount || '',
            calories: caloriesValue,
            usePer100g: Boolean(entry.usePer100g),
            caloriesPer100g: entry.caloriesPer100g !== null && entry.caloriesPer100g !== undefined
                ? Number(entry.caloriesPer100g)
                : null,
            updatedAt: new Date().toISOString()
        }
        if (existing) {
            Object.assign(existing, payload)
            if (!existing.usage) {
                existing.usage = { count: 0, lastUsedAt: null }
            }
            if (!existing.sectionUsage) {
                existing.sectionUsage = {}
            }
            return
        }
        foodSuggestions.value.push({
            id: `suggestion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            usage: { count: 0, lastUsedAt: null },
            sectionUsage: {},
            ...payload
        })
    }

    function addSuggestion(suggestion) {
        const name = String(suggestion.name || '').trim()
        const caloriesValue = Number(suggestion.calories)
        if (!name || !Number.isFinite(caloriesValue)) return
        foodSuggestions.value.push({
            id: `suggestion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name,
            amount: suggestion.amount || '',
            calories: caloriesValue,
            usePer100g: Boolean(suggestion.usePer100g),
            caloriesPer100g: suggestion.caloriesPer100g !== null && suggestion.caloriesPer100g !== undefined
                ? Number(suggestion.caloriesPer100g)
                : null,
            updatedAt: new Date().toISOString(),
            usage: { count: 0, lastUsedAt: null },
            sectionUsage: {}
        })
    }

    function updateSuggestion(id, updates) {
        const index = foodSuggestions.value.findIndex(suggestion => suggestion.id === id)
        if (index === -1) return
        foodSuggestions.value[index] = {
            ...foodSuggestions.value[index],
            ...updates,
            name: String(updates.name ?? foodSuggestions.value[index].name).trim(),
            calories: Number(updates.calories ?? foodSuggestions.value[index].calories) || 0,
            usePer100g: Boolean(updates.usePer100g ?? foodSuggestions.value[index].usePer100g),
            caloriesPer100g: updates.caloriesPer100g !== undefined
                ? Number(updates.caloriesPer100g)
                : foodSuggestions.value[index].caloriesPer100g,
            updatedAt: new Date().toISOString(),
            usage: foodSuggestions.value[index].usage || { count: 0, lastUsedAt: null },
            sectionUsage: foodSuggestions.value[index].sectionUsage || {}
        }
    }

    function deleteSuggestion(id) {
        const index = foodSuggestions.value.findIndex(suggestion => suggestion.id === id)
        if (index !== -1) {
            foodSuggestions.value.splice(index, 1)
        }
    }

    function trackSuggestionLoad(id, section) {
        const item = foodSuggestions.value.find(suggestion => suggestion.id === id)
        if (!item) return
        const now = new Date().toISOString()
        if (!item.usage) {
            item.usage = { count: 0, lastUsedAt: null }
        }
        if (!item.sectionUsage) {
            item.sectionUsage = {}
        }
        item.usage.count += 1
        item.usage.lastUsedAt = now

        const sectionKey = section || '__unsectioned__'
        const current = item.sectionUsage[sectionKey] || { count: 0, lastUsedAt: null }
        item.sectionUsage[sectionKey] = {
            count: current.count + 1,
            lastUsedAt: now
        }
    }

    return {
        startWeight,
        currentWeight,
        averageWeight,
        goalWeight,
        height,
        weeklyRate,
        logs,
        calculatedTDEE,
        foodDiaryEnabled,
        diarySections,
        foodDiaryEntries,
        foodSuggestions,
        aiMealRecognitionEnabled,
        openAiApiKey,
        addLog,
        deleteLog,
        updateTDEE,
        resetAll,
        setFoodDiaryEnabled,
        setDiarySections,
        setAiMealRecognitionEnabled,
        setOpenAiApiKey,
        addDiaryEntry,
        updateDiaryEntry,
        deleteDiaryEntry,
        getDiaryEntriesByDate,
        getDiaryEntriesByDateAndSection,
        sumDiaryCaloriesByDate,
        sumDiaryCaloriesByDateAndSection,
        addSuggestion,
        updateSuggestion,
        deleteSuggestion,
        trackSuggestionLoad
    }
})
