import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'tdee_suggestions_store'

function normalizeSuggestions(items) {
    return (Array.isArray(items) ? items : []).map((item) => ({
        ...item,
        notes: String(item?.notes || ''),
        tags: Array.isArray(item?.tags)
            ? [...new Set(item.tags.map(tag => String(tag || '').trim()).filter(Boolean))]
            : [],
        usage: item?.usage || { count: 0, lastUsedAt: null },
        sectionUsage: item?.sectionUsage || {}
    }))
}

export const useSuggestionsStore = defineStore('suggestions', () => {
    const foodSuggestions = ref([])

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
            notes: existing?.notes || '',
            tags: Array.isArray(existing?.tags) ? existing.tags : [],
            updatedAt: new Date().toISOString()
        }
        if (existing) {
            Object.assign(existing, payload)
            if (!existing.usage) existing.usage = { count: 0, lastUsedAt: null }
            if (!existing.sectionUsage) existing.sectionUsage = {}
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
            notes: String(suggestion.notes || ''),
            tags: Array.isArray(suggestion.tags)
                ? [...new Set(suggestion.tags.map(tag => String(tag || '').trim()).filter(Boolean))]
                : [],
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
            notes: String(updates.notes ?? foodSuggestions.value[index].notes ?? ''),
            tags: updates.tags !== undefined
                ? [...new Set((Array.isArray(updates.tags) ? updates.tags : []).map(tag => String(tag || '').trim()).filter(Boolean))]
                : (Array.isArray(foodSuggestions.value[index].tags) ? foodSuggestions.value[index].tags : []),
            updatedAt: new Date().toISOString(),
            usage: foodSuggestions.value[index].usage || { count: 0, lastUsedAt: null },
            sectionUsage: foodSuggestions.value[index].sectionUsage || {}
        }
    }

    function deleteSuggestion(id) {
        const index = foodSuggestions.value.findIndex(suggestion => suggestion.id === id)
        if (index !== -1) foodSuggestions.value.splice(index, 1)
    }

    function trackSuggestionLoad(id, section) {
        const item = foodSuggestions.value.find(suggestion => suggestion.id === id)
        if (!item) return
        const now = new Date().toISOString()
        if (!item.usage) item.usage = { count: 0, lastUsedAt: null }
        if (!item.sectionUsage) item.sectionUsage = {}
        item.usage.count += 1
        item.usage.lastUsedAt = now

        const sectionKey = section || '__unsectioned__'
        const current = item.sectionUsage[sectionKey] || { count: 0, lastUsedAt: null }
        item.sectionUsage[sectionKey] = {
            count: current.count + 1,
            lastUsedAt: now
        }
    }

    function resetSuggestions() {
        foodSuggestions.value = []
    }

    if (localStorage.getItem(STORAGE_KEY)) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
        if (stored) {
            foodSuggestions.value = normalizeSuggestions(stored.foodSuggestions)
        }
    }

    watch([foodSuggestions], () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            foodSuggestions: foodSuggestions.value
        }))
    }, { deep: true })

    return {
        foodSuggestions,
        upsertSuggestionFromEntry,
        addSuggestion,
        updateSuggestion,
        deleteSuggestion,
        trackSuggestionLoad,
        normalizeSuggestions,
        resetSuggestions
    }
})
