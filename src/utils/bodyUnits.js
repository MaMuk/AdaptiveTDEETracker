const KG_PER_LB = 0.45359237
const CM_PER_IN = 2.54
const IN_PER_FT = 12

export function kgToLb(kg) {
  const value = Number(kg)
  if (!Number.isFinite(value)) return null
  return value / KG_PER_LB
}

export function lbToKg(lb) {
  const value = Number(lb)
  if (!Number.isFinite(value)) return null
  return value * KG_PER_LB
}

export function cmToFtIn(cm) {
  const value = Number(cm)
  if (!Number.isFinite(value)) return { feet: null, inches: null }
  const totalInches = value / CM_PER_IN
  const feet = Math.floor(totalInches / IN_PER_FT)
  const inches = totalInches - (feet * IN_PER_FT)
  return { feet, inches }
}

export function ftInToCm(feet, inches) {
  const ft = Number(feet)
  const inch = Number(inches)
  if (!Number.isFinite(ft) && !Number.isFinite(inch)) return null
  const safeFeet = Number.isFinite(ft) ? Math.max(0, ft) : 0
  const safeInches = Number.isFinite(inch) ? Math.max(0, inch) : 0
  return ((safeFeet * IN_PER_FT) + safeInches) * CM_PER_IN
}

export function roundWeight(value, digits = 1) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const p = 10 ** digits
  return Math.round(n * p) / p
}

export function formatWeightFromKg(kg, system = 'metric', digits = 1) {
  const value = Number(kg)
  if (!Number.isFinite(value)) return '—'
  if (system === 'imperial') {
    return `${roundWeight(kgToLb(value), digits).toFixed(digits)} lb`
  }
  return `${roundWeight(value, digits).toFixed(digits)} kg`
}

export function formatHeightFromCm(cm, system = 'metric') {
  const value = Number(cm)
  if (!Number.isFinite(value)) return '—'
  if (system === 'imperial') {
    const { feet, inches } = cmToFtIn(value)
    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return '—'
    return `${feet} ft ${roundWeight(inches, 1).toFixed(1)} in`
  }
  return `${roundWeight(value, 1).toFixed(1)} cm`
}

export function convertWeeklyRateKg(rateKg, system = 'metric') {
  const value = Number(rateKg)
  if (!Number.isFinite(value)) return null
  return system === 'imperial' ? kgToLb(value) : value
}
