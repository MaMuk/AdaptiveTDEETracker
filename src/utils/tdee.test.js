import assert from 'node:assert/strict'
import {
  calculateAdaptiveTDEE,
  calculateDailyCalorieAdjustment,
  calculateLoggedMaintenanceCalories,
  computeCalorieTarget,
  estimateInitialTDEE,
  KCAL_PER_KG_WEIGHT_CHANGE,
  sanitizeTdeeSmoothingWindowWeeks,
  TDEE_SMOOTHING_WINDOW_WEEKS
} from './tdee.js'
import { formatDateKeyLocal } from './dateKey.js'

function makeDailyLogs({ startDate, days, startWeight, endWeight, calories }) {
  const out = []
  const start = new Date(startDate)
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const date = formatDateKeyLocal(d)
    const t = days <= 1 ? 1 : i / (days - 1)
    const weight = startWeight + ((endWeight - startWeight) * t)
    out.push({ date, weight: Number(weight.toFixed(2)), calories })
  }
  return out
}

function makePhasedLossLogs() {
  const out = []
  const start = new Date('2026-01-01')
  for (let i = 0; i < 112; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const phase = Math.floor(i / 28)
    const weight = 100 + (
      phase === 0
        ? i * -0.01
        : phase === 1
          ? -0.28 + ((i - 28) * -0.02)
          : phase === 2
            ? -0.84 + ((i - 56) * -0.08)
            : -3.08 + ((i - 84) * -0.08)
    )
    out.push({ date: formatDateKeyLocal(d), weight: Number(weight.toFixed(2)), calories: 2300 })
  }
  return out
}

function addDaysLocal(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return formatDateKeyLocal(date)
}

function makeSpreadsheetCompatibilityLogs() {
  const weeks = [
    ['2026-04-27', [null, null, null, null, 111, 111, 110], [null, null, null, null, 2979, 2532, 1958]],
    ['2026-05-04', [109, 108.7, 109, 108.5, 107.7, 107.7, 108.1], [2397, 1913, 1717, 1856, 1597, 2102, 1953]],
    ['2026-05-11', [108.2, 108, 107.3, 106.9, 107.2, 107.5, 107], [1925, 1690, 1894, 1978, 2070, 1140, 3200]],
    ['2026-05-18', [107.9, 108.2, 109.2, 107.6, 107.6, 106.8, 107.2], [2234, 3825, 2325, 2325, 1350, 1798, 1349]],
    ['2026-05-25', [106.2, 106.7, 106.3, 105.7, 105.6, 105.4, 106.2], [2069, 1769, 2164, 2022, 1467, 2249, 2447]],
    ['2026-06-01', [105.8, 105.7, 105.8, 105.2, 105.7, null, null], [1688, 1829, 2037, 1921, 2056, null, null]]
  ]
  const logs = []
  for (const [weekStart, weights, calories] of weeks) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      if (weights[dayIndex] === null && calories[dayIndex] === null) continue
      logs.push({
        date: addDaysLocal(weekStart, dayIndex),
        weight: weights[dayIndex],
        calories: calories[dayIndex]
      })
    }
  }
  return logs
}

function testInitialEstimate() {
  assert.equal(estimateInitialTDEE(100), 2875)
  assert.equal(estimateInitialTDEE(null), 2000)
}

function testMaintenanceFromLogsReturnsNumber() {
  const logs = makeDailyLogs({ startDate: '2026-01-01', days: 14, startWeight: 100, endWeight: 99, calories: 2300 })
  const maintenance = calculateLoggedMaintenanceCalories(logs, 100)
  assert.ok(Number.isFinite(maintenance))
  assert.equal(maintenance % 25, 0)
}

function testDailyAdjustmentRounding() {
  const adjustment = calculateDailyCalorieAdjustment(0.75)
  const expected = Math.round(((0.75 * KCAL_PER_KG_WEIGHT_CHANGE) / 7) / 5) * 5
  assert.equal(adjustment, expected)
}

function testGoalAwareTarget() {
  const maintenance = 3000
  const cut = computeCalorieTarget(maintenance, 0.75, { currentWeight: 100, goalWeight: 90 })
  const gain = computeCalorieTarget(maintenance, 0.75, { currentWeight: 90, goalWeight: 100 })
  assert.ok(cut < maintenance)
  assert.ok(gain > maintenance)
}

function testCompatibilityAdaptivePayload() {
  const logs = makeDailyLogs({ startDate: '2026-01-01', days: 7, startWeight: 90, endWeight: 89.7, calories: 2200 })
  const result = calculateAdaptiveTDEE(logs, 2500)
  assert.ok(Number.isFinite(result.tdee))
  assert.equal(result.mode, 'logged-trend')
}

function testAdaptiveTDEEUsesProvidedStartWeight() {
  const logs = makeDailyLogs({ startDate: '2026-01-01', days: 7, startWeight: 120, endWeight: 119.5, calories: 2400 })
  const loggedMaintenance = calculateLoggedMaintenanceCalories(logs, 120)
  const result = calculateAdaptiveTDEE(logs, 2500, 120)
  assert.equal(result.tdee, loggedMaintenance)
}

function testSmoothingWindowOption() {
  const logs = makePhasedLossLogs()
  const defaultMaintenance = calculateLoggedMaintenanceCalories(logs, 100)
  const explicitDefaultMaintenance = calculateLoggedMaintenanceCalories(logs, 100, { smoothingWindowWeeks: TDEE_SMOOTHING_WINDOW_WEEKS })
  const shorterWindowMaintenance = calculateLoggedMaintenanceCalories(logs, 100, { smoothingWindowWeeks: 4 })
  const result = calculateAdaptiveTDEE(logs, 2500, 100, { smoothingWindowWeeks: 4 })

  assert.equal(defaultMaintenance, explicitDefaultMaintenance)
  assert.ok(shorterWindowMaintenance > defaultMaintenance)
  assert.equal(result.tdee, shorterWindowMaintenance)
  assert.equal(result.optionsUsed.smoothingWindowWeeks, 4)
}

function testSmoothingWindowSanitizer() {
  assert.equal(sanitizeTdeeSmoothingWindowWeeks(undefined), TDEE_SMOOTHING_WINDOW_WEEKS)
  assert.equal(sanitizeTdeeSmoothingWindowWeeks(0), 1)
  assert.equal(sanitizeTdeeSmoothingWindowWeeks(4.4), 4)
  assert.equal(sanitizeTdeeSmoothingWindowWeeks(100), 52)
}

function testSpreadsheetCompatibilityFixture() {
  const logs = makeSpreadsheetCompatibilityLogs()
  const dailyDeficit = calculateDailyCalorieAdjustment(0.75)

  assert.equal(calculateLoggedMaintenanceCalories(logs, 111, { smoothingWindowWeeks: 12 }), 3150)
  assert.equal(calculateLoggedMaintenanceCalories(logs, 111, { smoothingWindowWeeks: 4 }), 3050)
  assert.equal(calculateLoggedMaintenanceCalories(logs, 111, { smoothingWindowWeeks: 2 }), 2825)
  assert.equal(calculateLoggedMaintenanceCalories(logs, 111, { smoothingWindowWeeks: 12 }) - dailyDeficit, 2325)
  assert.equal(calculateLoggedMaintenanceCalories(logs, 111, { smoothingWindowWeeks: 4 }) - dailyDeficit, 2225)
  assert.equal(calculateLoggedMaintenanceCalories(logs, 111, { smoothingWindowWeeks: 2 }) - dailyDeficit, 2000)
}

function run() {
  testInitialEstimate()
  testMaintenanceFromLogsReturnsNumber()
  testDailyAdjustmentRounding()
  testGoalAwareTarget()
  testCompatibilityAdaptivePayload()
  testAdaptiveTDEEUsesProvidedStartWeight()
  testSmoothingWindowOption()
  testSmoothingWindowSanitizer()
  testSpreadsheetCompatibilityFixture()
  console.log('tdee tests passed')
}

run()
