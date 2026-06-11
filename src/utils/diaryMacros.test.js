import assert from 'node:assert/strict'
import { hasTrackedMacroValueForEntry, macroTotalFromEntry } from './diaryMacros.js'

function testMeasuredPer100MacroIsStoredAsLoggedTotal() {
  const entry = {
    amount: '225 g',
    densityMode: 'per100',
    protein: 45,
    carbohydrates: 67.5,
    fat: 9
  }

  assert.equal(macroTotalFromEntry(entry, 'protein'), 45)
  assert.equal(macroTotalFromEntry(entry, 'carbohydrates'), 67.5)
  assert.equal(macroTotalFromEntry(entry, 'fat'), 9)
}

function testLegacyZeroTripletRemainsUntracked() {
  const entry = {
    protein: 0,
    carbohydrates: 0,
    fat: 0
  }

  assert.equal(hasTrackedMacroValueForEntry(entry, 'protein'), false)
  assert.equal(macroTotalFromEntry(entry, 'protein'), null)
}

function run() {
  testMeasuredPer100MacroIsStoredAsLoggedTotal()
  testLegacyZeroTripletRemainsUntracked()
  console.log('diaryMacros tests passed')
}

run()
