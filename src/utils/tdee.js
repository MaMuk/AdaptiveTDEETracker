import { dateKeyToTime } from './dateKey.js'

export const KCAL_PER_KG_WEIGHT_CHANGE = 7716.17
export const MAINTENANCE_KCAL_PER_KG_BODY_WEIGHT = 28.66006
export const TDEE_SMOOTHING_WINDOW_WEEKS = 12

const DEFAULT_START_WEIGHT_KG = 70
const MIN_RECOMMENDED_CALORIES = 0
const DEFAULT_HEIGHT_CM = 170
const DEFAULT_AGE = 30

const ACTIVITY_MULTIPLIER_BY_LEVEL = {
  very_low: 1.2,
  low: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9
}

function toNumberOrNull(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function roundToStep(value, step) {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(step)) || Number(step) <= 0) return null
  return Math.round(Number(value) / Number(step)) * Number(step)
}

function normalizeLogDate(date) {
  return String(date || '').trim().replaceAll('/', '-')
}

function toDateMs(date) {
  return dateKeyToTime(normalizeLogDate(date))
}

function getTrackingWeeks(logs = []) {
  const sortedLogs = [...(Array.isArray(logs) ? logs : [])]
    .filter((entry) => entry && entry.date)
    .map((entry) => ({
      date: normalizeLogDate(entry.date),
      weight: toNumberOrNull(entry.weight),
      calories: toNumberOrNull(entry.calories)
    }))
    .filter((entry) => Number.isFinite(toDateMs(entry.date)))
    .sort((a, b) => toDateMs(a.date) - toDateMs(b.date))

  if (sortedLogs.length === 0) return []

  const firstDateMs = toDateMs(sortedLogs[0].date)
  const weeks = []

  for (const log of sortedLogs) {
    const dayOffset = Math.floor((toDateMs(log.date) - firstDateMs) / 86400000)
    const weekIndex = Math.max(0, Math.floor(dayOffset / 7))

    if (!weeks[weekIndex]) {
      weeks[weekIndex] = { weights: [], calories: [] }
    }

    if (Number.isFinite(log.weight) && log.weight > 0) weeks[weekIndex].weights.push(log.weight)
    if (Number.isFinite(log.calories) && log.calories > 0) weeks[weekIndex].calories.push(log.calories)
  }

  return weeks.filter(Boolean)
}

function calculateAverage(values = []) {
  if (!Array.isArray(values) || values.length === 0) return null
  const sum = values.reduce((total, value) => total + value, 0)
  return sum / values.length
}

export function estimateInitialTDEE(weightKg) {
  const weight = toNumberOrNull(weightKg)
  const effectiveWeight = Number.isFinite(weight) && weight > 0 ? weight : DEFAULT_START_WEIGHT_KG
  return roundToStep(effectiveWeight * MAINTENANCE_KCAL_PER_KG_BODY_WEIGHT, 25)
}

export function getCompleteLogs(logs = []) {
  return [...(Array.isArray(logs) ? logs : [])]
    .filter((entry) => entry && entry.date)
    .map((entry) => ({
      ...entry,
      date: normalizeLogDate(entry.date),
      weight: toNumberOrNull(entry.weight),
      calories: toNumberOrNull(entry.calories)
    }))
    .filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0 && Number.isFinite(entry.calories) && entry.calories > 0)
    .sort((a, b) => toDateMs(a.date) - toDateMs(b.date))
}

export function calculateLoggedMaintenanceCalories(logs = [], startWeightKg = null) {
  const startWeight = toNumberOrNull(startWeightKg)
  const effectiveStartWeight = Number.isFinite(startWeight) && startWeight > 0 ? startWeight : DEFAULT_START_WEIGHT_KG
  const weeklyLogs = getTrackingWeeks(logs)

  if (weeklyLogs.length === 0) {
    return estimateInitialTDEE(effectiveStartWeight)
  }

  const baseMaintenanceCalories = roundToStep(effectiveStartWeight * MAINTENANCE_KCAL_PER_KG_BODY_WEIGHT, 5)
  const weekWeightAverage = weeklyLogs.map((week) => calculateAverage(week.weights))
  const weekCalorieAverage = weeklyLogs.map((week) => calculateAverage(week.calories))
  const weekWeightEntries = weeklyLogs.map((week) => week.weights.length)
  const weekCalorieEntries = weeklyLogs.map((week) => week.calories.length)

  const weekMaintenanceRaw = []
  const weekMaintenanceRounded = []

  if (weekWeightEntries[0] > 0 && weekCalorieEntries[0] > 0) {
    const firstWeekDeltaFromStart = weekWeightAverage[0] - effectiveStartWeight
    const firstWeekMaintenance = weekCalorieAverage[0] + ((-firstWeekDeltaFromStart * KCAL_PER_KG_WEIGHT_CHANGE) / weekCalorieEntries[0])
    weekMaintenanceRaw[0] = firstWeekMaintenance
    weekMaintenanceRounded[0] = roundToStep(firstWeekMaintenance, 5)
  } else {
    weekMaintenanceRaw[0] = baseMaintenanceCalories
    weekMaintenanceRounded[0] = baseMaintenanceCalories
  }

  for (let weekIndex = 1; weekIndex < weeklyLogs.length; weekIndex += 1) {
    const hasFullCurrentWeek = weekWeightEntries[weekIndex] >= 7 && weekCalorieEntries[weekIndex] >= 7

    if (!hasFullCurrentWeek || !Number.isFinite(weekWeightAverage[weekIndex - 1])) {
      weekMaintenanceRaw[weekIndex] = weekMaintenanceRaw[weekIndex - 1]
      weekMaintenanceRounded[weekIndex] = weekMaintenanceRounded[weekIndex - 1]
      continue
    }

    const weeklyWeightDelta = weekWeightAverage[weekIndex] - weekWeightAverage[weekIndex - 1]
    const observedWeekMaintenance = weekCalorieAverage[weekIndex] + ((-weeklyWeightDelta * KCAL_PER_KG_WEIGHT_CHANGE) / weekCalorieEntries[weekIndex])

    const weeksInBlend = Math.min(weekIndex + 1, TDEE_SMOOTHING_WINDOW_WEEKS)
    const blendStartIndex = Math.max(0, weekIndex - (weeksInBlend - 1))
    const previousRoundedMaintenanceSum = weekMaintenanceRounded
      .slice(blendStartIndex, weekIndex)
      .reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0)

    const blendedMaintenance = (observedWeekMaintenance + previousRoundedMaintenanceSum) / weeksInBlend
    weekMaintenanceRaw[weekIndex] = blendedMaintenance
    weekMaintenanceRounded[weekIndex] = roundToStep(blendedMaintenance, 5)
  }

  const latestMaintenance = weekMaintenanceRaw[weekMaintenanceRaw.length - 1]
  if (!Number.isFinite(latestMaintenance)) {
    return estimateInitialTDEE(effectiveStartWeight)
  }

  return roundToStep(latestMaintenance, 25)
}

export function calculateDailyCalorieAdjustment(weeklyRateKg) {
  const weeklyRate = Math.abs(Number(weeklyRateKg))
  if (!Number.isFinite(weeklyRate) || weeklyRate <= 0) return 0
  const rawAdjustment = (weeklyRate * KCAL_PER_KG_WEIGHT_CHANGE) / 7
  return roundToStep(rawAdjustment, 5) || 0
}

export function calculateMifflinStJeorBmr({ weightKg, heightCm, ageYears, sex }) {
  const safeWeight = Number.isFinite(Number(weightKg)) && Number(weightKg) > 0 ? Number(weightKg) : DEFAULT_START_WEIGHT_KG
  const safeHeight = Number.isFinite(Number(heightCm)) && Number(heightCm) > 0 ? Number(heightCm) : DEFAULT_HEIGHT_CM
  const safeAge = Number.isFinite(Number(ageYears)) && Number(ageYears) > 0 ? Number(ageYears) : DEFAULT_AGE
  const sexOffset = String(sex || '').toLowerCase() === 'female' ? -161 : 5
  return (10 * safeWeight) + (6.25 * safeHeight) - (5 * safeAge) + sexOffset
}

export function calculateActivityBasedMaintenanceCalories({ weightKg, heightCm, ageYears, sex, activityLevel }) {
  const bmr = calculateMifflinStJeorBmr({ weightKg, heightCm, ageYears, sex })
  const multiplier = ACTIVITY_MULTIPLIER_BY_LEVEL[String(activityLevel || '').toLowerCase()] || ACTIVITY_MULTIPLIER_BY_LEVEL.low
  return roundToStep(bmr * multiplier, 25)
}

export function blendMaintenanceCalories({ loggedMaintenanceCalories, activityBasedMaintenanceCalories, manualBias }) {
  const logged = Number(loggedMaintenanceCalories)
  const activity = Number(activityBasedMaintenanceCalories)
  if (!Number.isFinite(logged) && !Number.isFinite(activity)) return null
  if (!Number.isFinite(logged)) return activity
  if (!Number.isFinite(activity)) return logged
  const bias = Number.isFinite(Number(manualBias))
    ? Math.max(0, Math.min(1, Number(manualBias)))
    : 0
  const blended = (logged * (1 - bias)) + (activity * bias)
  return roundToStep(blended, 25)
}

export function computeCalorieTarget(maintenanceCalories, weeklyRateKg, context = {}) {
  const maintenance = Number(maintenanceCalories)
  if (!Number.isFinite(maintenance)) return 0

  const goalWeight = toNumberOrNull(context.goalWeight)
  const currentWeight = toNumberOrNull(context.currentWeight)

  const hasGoalContext = Number.isFinite(goalWeight) && Number.isFinite(currentWeight)
  let direction = 0
  if (hasGoalContext) {
    direction = goalWeight === currentWeight ? 0 : goalWeight > currentWeight ? 1 : -1
  } else {
    const weeklyRate = Number(weeklyRateKg)
    direction = weeklyRate === 0 ? 0 : weeklyRate > 0 ? 1 : -1
  }

  const adjustment = calculateDailyCalorieAdjustment(weeklyRateKg)
  const target = direction === 0
    ? maintenance
    : direction > 0
      ? maintenance + adjustment
      : maintenance - adjustment

  return Math.max(MIN_RECOMMENDED_CALORIES, target)
}

export function calculateAdaptiveTDEE(logs = [], baselineTDEE = null) {
  const baseline = Number.isFinite(Number(baselineTDEE))
    ? roundToStep(Number(baselineTDEE), 25)
    : estimateInitialTDEE(DEFAULT_START_WEIGHT_KG)

  const maintenanceCalories = calculateLoggedMaintenanceCalories(logs, null)
  const completeLogCount = getCompleteLogs(logs).length

  return {
    tdee: maintenanceCalories,
    baselineTDEE: baseline,
    observedTDEE: maintenanceCalories,
    cappedObservedTDEE: maintenanceCalories,
    trust: completeLogCount > 0 ? 1 : 0,
    appliedManualBias: 0,
    effectiveTrust: completeLogCount > 0 ? 1 : 0,
    manualBias: 0,
    confidence: completeLogCount >= 7 ? 'high' : completeLogCount > 0 ? 'low' : 'baseline',
    mode: 'logged-trend',
    daysTracked: completeLogCount,
    logCount: completeLogCount,
    epochStartDate: completeLogCount > 0 ? getCompleteLogs(logs)[0].date : null,
    epochEndDate: completeLogCount > 0 ? getCompleteLogs(logs)[completeLogCount - 1].date : null,
    detectedNewEpoch: false,
    epochCount: completeLogCount > 0 ? 1 : 0,
    completeLogCount,
    optionsUsed: {}
  }
}
