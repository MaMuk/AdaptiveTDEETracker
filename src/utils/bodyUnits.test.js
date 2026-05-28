import assert from 'node:assert/strict'
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from './bodyUnits.js'

function testWeightRoundTrip() {
  const kg = 82.4
  const lb = kgToLb(kg)
  const roundTrip = lbToKg(lb)
  assert.ok(Math.abs(roundTrip - kg) < 1e-9)
}

function testHeightRoundTrip() {
  const cm = 180
  const { feet, inches } = cmToFtIn(cm)
  const roundTrip = ftInToCm(feet, inches)
  assert.ok(Math.abs(roundTrip - cm) < 1e-9)
}

function run() {
  testWeightRoundTrip()
  testHeightRoundTrip()
  console.log('bodyUnits tests passed')
}

run()
