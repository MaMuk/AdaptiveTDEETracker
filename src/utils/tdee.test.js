import assert from 'node:assert/strict'
import { calculateAdaptiveTDEE, estimateInitialTDEE } from './tdee.js'

function makeLogs({ startDate, days, startWeight, endWeight, calories }) {
  const out = []
  const start = new Date(startDate)
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const date = d.toISOString().slice(0, 10)
    const t = days <= 1 ? 1 : i / (days - 1)
    const weight = startWeight + ((endWeight - startWeight) * t)
    out.push({ date, weight: Number(weight.toFixed(2)), calories })
  }
  return out
}

function testFirstWeekSpike() {
  const logs = makeLogs({ startDate: '2026-01-01', days: 7, startWeight: 100, endWeight: 98, calories: 2250 })
  const baseline = estimateInitialTDEE(100)
  const result = calculateAdaptiveTDEE(logs, baseline)
  assert.equal(result.confidence, 'baseline')
  assert.ok(Math.abs(result.tdee - baseline) <= 160)
  assert.ok(result.tdee < 3500)
}

function testThreeToSixWeekAdaptation() {
  const logs = makeLogs({ startDate: '2026-01-01', days: 35, startWeight: 100, endWeight: 97.8, calories: 2250 })
  const baseline = estimateInitialTDEE(100)
  const result = calculateAdaptiveTDEE(logs, baseline)
  assert.ok(result.trust > 0.3)
  assert.ok(result.mode === 'blended' || result.mode === 'adaptive')
  assert.ok(Number.isFinite(result.observedTDEE))
}

function testLongPauseEpoch() {
  const oldLogs = makeLogs({ startDate: '2025-01-01', days: 50, startWeight: 95, endWeight: 94, calories: 2300 })
  const newLogs = makeLogs({ startDate: '2026-04-01', days: 10, startWeight: 90, endWeight: 89.8, calories: 2200 })
  const logs = [...oldLogs, ...newLogs]
  const baseline = estimateInitialTDEE(90)
  const result = calculateAdaptiveTDEE(logs, baseline)
  assert.equal(result.epochStartDate, '2026-04-01')
  assert.equal(result.detectedNewEpoch, true)
}

function testDeterministicSameFinalLogs() {
  const original = makeLogs({ startDate: '2026-02-01', days: 20, startWeight: 90, endWeight: 89.4, calories: 2200 })
  const baseline = estimateInitialTDEE(90)
  const first = calculateAdaptiveTDEE(original, baseline)

  const mutated = [...original]
  const removed = mutated.splice(8, 1)[0]
  mutated.push(removed)
  const second = calculateAdaptiveTDEE(mutated, baseline)

  assert.equal(first.tdee, second.tdee)
  assert.equal(first.trust, second.trust)
  assert.equal(first.epochStartDate, second.epochStartDate)
}

function run() {
  testFirstWeekSpike()
  testThreeToSixWeekAdaptation()
  testLongPauseEpoch()
  testDeterministicSameFinalLogs()
  console.log('tdee tests passed')
}

run()
