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
        }
    }

    // Watch and save to local storage
    watch([startWeight, goalWeight, height, weeklyRate, logs, calculatedTDEE], () => {
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
            calculatedTDEE: calculatedTDEE.value
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
        localStorage.removeItem('tdee_user_store')
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
        addLog,
        deleteLog,
        updateTDEE,
        resetAll
    }
})
