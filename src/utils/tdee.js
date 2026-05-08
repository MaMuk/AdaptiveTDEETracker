export const CALORIES_PER_KG = 7700
export const MIN_LOGS_FOR_ADAPTIVE = 8
export const FULL_TRUST_DAYS = 42
export const HARD_GAP_DAYS = 28
export const SOFT_GAP_DAYS = 14
export const LARGE_WEIGHT_CHANGE_PCT = 0.03

const DEFAULT_TDEE = 2000
const MIN_TDEE_SANITY = 1200
const MAX_TDEE_SANITY = 5000

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function toDateMs(date) {
  return new Date(date).getTime()
}

function dayDiff(a, b) {
  return Math.round((toDateMs(b) - toDateMs(a)) / 86400000)
}

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function estimateInitialTDEE(weightKg) {
  if (!weightKg) return DEFAULT_TDEE
  return Math.round(27.78 * weightKg + 97)
}

export function getCompleteLogs(logs = []) {
  return [...(Array.isArray(logs) ? logs : [])]
    .filter((entry) => entry && entry.date)
    .map((entry) => ({
      ...entry,
      weight: safeNumber(entry.weight),
      calories: safeNumber(entry.calories)
    }))
    .filter((entry) => Number.isFinite(entry.weight) && Number.isFinite(entry.calories) && entry.weight > 0 && entry.calories > 0)
    .sort((a, b) => toDateMs(a.date) - toDateMs(b.date))
}

export function splitLogsIntoEpochs(logs = []) {
  const complete = getCompleteLogs(logs)
  if (complete.length === 0) return []

  const epochs = []
  let current = [complete[0]]

  for (let i = 1; i < complete.length; i += 1) {
    const prev = complete[i - 1]
    const next = complete[i]
    const gapDays = dayDiff(prev.date, next.date)
    const weightChangePct = prev.weight > 0 ? Math.abs(next.weight - prev.weight) / prev.weight : 0
    // Epoch split logic:
    // - hard split after long inactivity
    // - soft split after medium inactivity only when bodyweight shifted materially
    const startsNewEpoch = gapDays >= HARD_GAP_DAYS || (gapDays >= SOFT_GAP_DAYS && weightChangePct >= LARGE_WEIGHT_CHANGE_PCT)

    if (startsNewEpoch) {
      epochs.push(current)
      current = [next]
    } else {
      current.push(next)
    }
  }

  if (current.length > 0) epochs.push(current)
  return epochs
}

export function getCurrentEpoch(logs = []) {
  const epochs = splitLogsIntoEpochs(logs)
  if (epochs.length === 0) return null
  return epochs[epochs.length - 1]
}

export function computeWeightSlope(entries = []) {
  const validEntries = entries.filter((e) => Number.isFinite(e.weight))
  const n = validEntries.length
  if (n < 2) return 0

  const firstDate = toDateMs(validEntries[0].date)

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0

  for (let i = 0; i < n; i += 1) {
    const entryDate = toDateMs(validEntries[i].date)
    const x = (entryDate - firstDate) / 86400000
    const y = validEntries[i].weight

    sumX += x
    sumY += y
    sumXY += x * y
    sumXX += x * x
  }

  const denominator = (n * sumXX) - (sumX * sumX)
  if (denominator === 0) return 0

  return (n * sumXY - sumX * sumY) / denominator
}

export function computeAverageCalories(entries = []) {
  const valid = entries.filter((e) => Number.isFinite(e.calories) && e.calories > 0)
  if (valid.length === 0) return 0
  return valid.reduce((acc, e) => acc + e.calories, 0) / valid.length
}

export function computeObservedTDEE(entries = []) {
  const avgCalories = computeAverageCalories(entries)
  if (!avgCalories) return null
  const slopeKgPerDay = computeWeightSlope(entries)
  return avgCalories - (slopeKgPerDay * CALORIES_PER_KG)
}

export function adaptiveTrust(daysTracked, completeLogCount) {
  // Trust ramp: no adaptation during the first week, then progressively trust observed trend
  // as both elapsed days and complete logs accumulate.
  if (daysTracked < 8) return 0
  const dayTrust = clamp((daysTracked - 8) / (FULL_TRUST_DAYS - 8), 0, 1)
  const logTrust = clamp((completeLogCount - MIN_LOGS_FOR_ADAPTIVE) / (FULL_TRUST_DAYS - MIN_LOGS_FOR_ADAPTIVE), 0, 1)
  return Math.round((dayTrust * logTrust) * 1000) / 1000
}

export function startupCap(daysTracked) {
  // Startup guardrail against early water/glycogen shifts causing unrealistic observed TDEE.
  if (daysTracked < 14) return 150
  if (daysTracked < 21) return 300
  if (daysTracked < 28) return 500
  if (daysTracked < 42) return 750
  return 1200
}

function blendBaselineWithHistory(baseBaseline, previousEpoch, currentEpoch) {
  if (!previousEpoch || previousEpoch.length < MIN_LOGS_FOR_ADAPTIVE || !currentEpoch || currentEpoch.length === 0) {
    return { baseline: baseBaseline, historyTrust: 0, previousReliableTDEE: null }
  }

  const previousReliableTDEE = computeObservedTDEE(previousEpoch)
  if (!Number.isFinite(previousReliableTDEE)) {
    return { baseline: baseBaseline, historyTrust: 0, previousReliableTDEE: null }
  }

  const previousLast = previousEpoch[previousEpoch.length - 1]
  const currentFirst = currentEpoch[0]
  const gapDays = Math.max(0, dayDiff(previousLast.date, currentFirst.date))
  const currentWeight = currentFirst.weight
  const previousWeight = previousLast.weight

  const recencyTrust = Math.exp(-gapDays / 90)
  const weightShift = previousWeight > 0 ? Math.abs(currentWeight - previousWeight) / previousWeight : 1
  const weightTrust = clamp(1 - (weightShift / 0.1), 0, 1)

  const previousEpochDays = Math.max(1, dayDiff(previousEpoch[0].date, previousLast.date) + 1)
  const reliabilityTrust = clamp(previousEpochDays / FULL_TRUST_DAYS, 0, 1)
  const historyTrust = clamp(recencyTrust * weightTrust * reliabilityTrust, 0, 1)

  const blended = (baseBaseline * (1 - historyTrust)) + (previousReliableTDEE * historyTrust)
  return { baseline: blended, historyTrust, previousReliableTDEE }
}

export function calculateAdaptiveTDEE(logs = [], baselineTDEE = null, options = {}) {
  const completeLogs = getCompleteLogs(logs)
  const epochs = splitLogsIntoEpochs(completeLogs)
  const currentEpoch = epochs.length > 0 ? epochs[epochs.length - 1] : []
  const previousEpoch = epochs.length > 1 ? epochs[epochs.length - 2] : null

  const hasCurrentWeight = currentEpoch.length > 0 ? currentEpoch[currentEpoch.length - 1].weight : null
  const fallbackBaseline = estimateInitialTDEE(hasCurrentWeight)
  const baseBaseline = Number.isFinite(Number(baselineTDEE))
    ? Number(baselineTDEE)
    : fallbackBaseline

  const { baseline: historyAdjustedBaseline } = blendBaselineWithHistory(baseBaseline, previousEpoch, currentEpoch)

  const logCount = currentEpoch.length
  const epochStartDate = logCount > 0 ? currentEpoch[0].date : null
  const epochEndDate = logCount > 0 ? currentEpoch[logCount - 1].date : null
  const daysTracked = epochStartDate && epochEndDate ? Math.max(1, dayDiff(epochStartDate, epochEndDate) + 1) : 0

  const observedTDEE = computeObservedTDEE(currentEpoch)
  const trust = adaptiveTrust(daysTracked, logCount)
  const capDelta = startupCap(daysTracked)

  const cappedObservedTDEE = Number.isFinite(observedTDEE)
    ? clamp(observedTDEE, historyAdjustedBaseline - capDelta, historyAdjustedBaseline + capDelta)
    : null

  const mode = trust <= 0 || !Number.isFinite(cappedObservedTDEE)
    ? 'baseline'
    : trust >= 0.95
      ? 'adaptive'
      : 'blended'

  const blendedTdee = Number.isFinite(cappedObservedTDEE)
    ? (historyAdjustedBaseline * (1 - trust)) + (cappedObservedTDEE * trust)
    : historyAdjustedBaseline

  const finalTDEE = clamp(Math.round(blendedTdee), MIN_TDEE_SANITY, MAX_TDEE_SANITY)

  const confidence = trust < 0.2
    ? 'baseline'
    : trust < 0.5
      ? 'low'
      : trust < 0.8
        ? 'medium'
        : 'high'

  return {
    tdee: finalTDEE,
    baselineTDEE: Math.round(historyAdjustedBaseline),
    observedTDEE: Number.isFinite(observedTDEE) ? Math.round(observedTDEE) : null,
    cappedObservedTDEE: Number.isFinite(cappedObservedTDEE) ? Math.round(cappedObservedTDEE) : null,
    trust,
    confidence,
    mode,
    daysTracked,
    logCount,
    epochStartDate,
    detectedNewEpoch: epochs.length > 1,
    epochCount: epochs.length,
    completeLogCount: completeLogs.length,
    optionsUsed: options
  }
}

export function computeCalorieTarget(adaptiveTDEE, weeklyRate) {
  const adjustmentPerDay = (weeklyRate * CALORIES_PER_KG) / 7
  return adaptiveTDEE + adjustmentPerDay
}
