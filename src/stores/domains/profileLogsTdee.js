import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
    blendMaintenanceCalories,
    calculateActivityBasedMaintenanceCalories,
    calculateAdaptiveTDEE,
    calculateLoggedMaintenanceCalories,
    estimateInitialTDEE
} from '../../utils/tdee'
import { useAppSettingsStore } from './appSettings'

const STORAGE_KEY = 'tdee_profile_logs_tdee_store'

export const useProfileLogsTdeeStore = defineStore('profileLogsTdee', () => {
    const appSettingsStore = useAppSettingsStore()
    const startWeight = ref(null)
    const goalWeight = ref(null)
    const height = ref(null)
    const age = ref(null)
    const sex = ref('male')
    const weeklyRate = ref(null)
    const logs = ref([])

    const baselineTDEE = ref(null)
    const tdeeSnapshotsByDate = ref({})
    const calculatedTDEE = ref(null)
    const tdeeDetails = ref(null)
    const lastTdeeMode = ref(null)

    const currentWeight = computed(() => {
        if (logs.value.length === 0) return startWeight.value
        const sortedLogs = [...logs.value].sort((a, b) => new Date(b.date) - new Date(a.date))
        return sortedLogs[0].weight || startWeight.value
    })

    function defaultBaselineFromStartWeight() {
        return startWeight.value ? estimateInitialTDEE(startWeight.value) : estimateInitialTDEE(70)
    }

    function ensureBaselineTDEE() {
        if (!Number.isFinite(Number(baselineTDEE.value))) {
            baselineTDEE.value = defaultBaselineFromStartWeight()
        }
    }

    function resolveSnapshotDate(explicitDate = null, result = null) {
        if (explicitDate && typeof explicitDate === 'string') return explicitDate
        if (result?.epochEndDate) return result.epochEndDate
        if (Array.isArray(logs.value) && logs.value.length > 0) {
            const last = [...logs.value]
                .filter(entry => entry && entry.date)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .at(-1)
            return last?.date || null
        }
        return null
    }

    function sanitizeTdeeSnapshots(rawSnapshots) {
        if (!rawSnapshots || typeof rawSnapshots !== 'object') return {}
        const out = {}
        for (const [date, snapshot] of Object.entries(rawSnapshots)) {
            if (!snapshot || typeof snapshot !== 'object') continue
            out[date] = {
                tdee: Number.isFinite(Number(snapshot.tdee)) ? Number(snapshot.tdee) : null,
                anchorBaselineTDEE: Number.isFinite(Number(snapshot.anchorBaselineTDEE)) ? Number(snapshot.anchorBaselineTDEE) : null,
                effectiveBaselineTDEE: Number.isFinite(Number(snapshot.effectiveBaselineTDEE)) ? Number(snapshot.effectiveBaselineTDEE) : null,
                observedTDEE: Number.isFinite(Number(snapshot.observedTDEE)) ? Number(snapshot.observedTDEE) : null,
                cappedObservedTDEE: Number.isFinite(Number(snapshot.cappedObservedTDEE)) ? Number(snapshot.cappedObservedTDEE) : null,
                trust: Number.isFinite(Number(snapshot.trust)) ? Number(snapshot.trust) : null,
                confidence: typeof snapshot.confidence === 'string' ? snapshot.confidence : null,
                mode: typeof snapshot.mode === 'string' ? snapshot.mode : null,
                daysTracked: Number.isFinite(Number(snapshot.daysTracked)) ? Number(snapshot.daysTracked) : null,
                logCount: Number.isFinite(Number(snapshot.logCount)) ? Number(snapshot.logCount) : null,
                epochEndDate: typeof snapshot.epochEndDate === 'string' ? snapshot.epochEndDate : null,
                updatedAt: typeof snapshot.updatedAt === 'string' ? snapshot.updatedAt : null
            }
        }
        return out
    }

    function writeSnapshot(dateKey, details) {
        if (!dateKey) return
        tdeeSnapshotsByDate.value = sanitizeTdeeSnapshots({
            ...(tdeeSnapshotsByDate.value || {}),
            [dateKey]: {
                tdee: details.tdee,
                anchorBaselineTDEE: details.anchorBaselineTDEE,
                effectiveBaselineTDEE: details.effectiveBaselineTDEE,
                observedTDEE: details.observedTDEE,
                cappedObservedTDEE: details.cappedObservedTDEE,
                trust: details.trust,
                confidence: details.confidence,
                mode: details.mode,
                daysTracked: details.daysTracked,
                logCount: details.logCount,
                epochEndDate: details.epochEndDate,
                updatedAt: new Date().toISOString()
            }
        })
    }

    const averageWeight = computed(() => {
        if (logs.value.length === 0) return startWeight.value
        const sortedLogs = [...logs.value].sort((a, b) => new Date(b.date) - new Date(a.date))
        const recentLogs = sortedLogs.slice(0, 7).filter(log => log.weight)
        if (recentLogs.length === 0) return startWeight.value
        const sum = recentLogs.reduce((acc, log) => acc + log.weight, 0)
        return sum / recentLogs.length
    })

    function updateTDEE(snapshotDate = null) {
        ensureBaselineTDEE()
        const maintenanceFromLogs = calculateLoggedMaintenanceCalories(logs.value, startWeight.value)
        const startupActivityEnabled = Boolean(appSettingsStore.appSettings?.startupActivityEnabled)
        const manualBias = Number(appSettingsStore.appSettings?.tdeeManualBias) || 0
        const startupActivityLevel = appSettingsStore.appSettings?.startupActivityLevel || 'low'
        const profileWeight = Number(currentWeight.value || startWeight.value)
        const activityBasedMaintenance = startupActivityEnabled
            ? calculateActivityBasedMaintenanceCalories({
                weightKg: profileWeight,
                heightCm: height.value,
                ageYears: age.value,
                sex: sex.value,
                activityLevel: startupActivityLevel
            })
            : null
        const finalMaintenanceCalories = startupActivityEnabled
            ? blendMaintenanceCalories({
                loggedMaintenanceCalories: maintenanceFromLogs,
                activityBasedMaintenanceCalories: activityBasedMaintenance,
                manualBias
            })
            : maintenanceFromLogs
        const result = calculateAdaptiveTDEE(logs.value, baselineTDEE.value)
        tdeeDetails.value = {
            ...result,
            anchorBaselineTDEE: Math.round(Number(baselineTDEE.value)),
            effectiveBaselineTDEE: Math.round(Number(result.baselineTDEE)),
            maintenanceFromLogs,
            activityBasedMaintenance,
            startupActivityEnabled,
            startupActivityLevel,
            manualBias,
            appliedManualBias: startupActivityEnabled ? manualBias : 0,
            effectiveTrust: startupActivityEnabled ? manualBias : 0
        }

        calculatedTDEE.value = finalMaintenanceCalories
        lastTdeeMode.value = result.mode || null
        writeSnapshot(resolveSnapshotDate(snapshotDate, result), tdeeDetails.value)
    }

    function addLog(date, weight, calories) {
        const index = logs.value.findIndex(l => l.date === date)
        if (index !== -1) {
            logs.value[index] = { date, weight, calories }
        } else {
            logs.value.push({ date, weight, calories })
            logs.value.sort((a, b) => new Date(a.date) - new Date(b.date))
        }
        updateTDEE(date)
    }

    function deleteLog(date) {
        const index = logs.value.findIndex(l => l.date === date)
        if (index !== -1) {
            logs.value.splice(index, 1)
            updateTDEE(date)
        }
    }

    function resetProfileLogsTdee() {
        startWeight.value = null
        goalWeight.value = null
        height.value = null
        age.value = null
        sex.value = 'male'
        weeklyRate.value = 0.5
        logs.value = []
        baselineTDEE.value = null
        tdeeSnapshotsByDate.value = {}
        calculatedTDEE.value = null
        tdeeDetails.value = null
    }

    if (localStorage.getItem(STORAGE_KEY)) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
        if (stored) {
            startWeight.value = stored.startWeight
            goalWeight.value = stored.goalWeight
            height.value = stored.height
            age.value = stored.age ?? null
            sex.value = stored.sex === 'female' ? 'female' : 'male'
            weeklyRate.value = stored.weeklyRate
            logs.value = stored.logs || []
            baselineTDEE.value = stored.baselineTDEE
                || stored.calculatedTDEE
                || null
            tdeeSnapshotsByDate.value = sanitizeTdeeSnapshots(stored.tdeeSnapshotsByDate)
        }
    }

    ensureBaselineTDEE()

    watch([startWeight, goalWeight, height, age, sex, weeklyRate, logs, baselineTDEE], () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            startWeight: startWeight.value,
            goalWeight: goalWeight.value,
            height: height.value,
            age: age.value,
            sex: sex.value,
            weeklyRate: weeklyRate.value,
            logs: logs.value,
            baselineTDEE: baselineTDEE.value,
            tdeeSnapshotsByDate: tdeeSnapshotsByDate.value
        }))
    }, { deep: true })

    watch([startWeight, height, age, sex, logs], () => {
        updateTDEE()
    }, { deep: true, immediate: true })

    watch(() => appSettingsStore.appSettings?.tdeeManualBias, () => {
        updateTDEE()
    })
    watch(() => appSettingsStore.appSettings?.startupActivityEnabled, () => {
        updateTDEE()
    })
    watch(() => appSettingsStore.appSettings?.startupActivityLevel, () => {
        updateTDEE()
    })

    return {
        startWeight,
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
        currentWeight,
        averageWeight,
        sanitizeTdeeSnapshots,
        addLog,
        deleteLog,
        updateTDEE,
        resetProfileLogsTdee
    }
})
