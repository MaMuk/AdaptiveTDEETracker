import assert from 'node:assert/strict'
import {
  calculateAdaptiveTDEE,
  calculateDailyCalorieAdjustment,
  calculateLoggedMaintenanceCalories,
  computeCalorieTarget,
  estimateInitialTDEE,
  KCAL_PER_KG_WEIGHT_CHANGE
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

function run() {
  testInitialEstimate()
  testMaintenanceFromLogsReturnsNumber()
  testDailyAdjustmentRounding()
  testGoalAwareTarget()
  testCompatibilityAdaptivePayload()
  console.log('tdee tests passed')
}

run()
