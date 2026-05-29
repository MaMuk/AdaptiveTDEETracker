export const AI_RECOGNITION_CONFIDENCE = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
}

const VALID_CONFIDENCE = new Set(Object.values(AI_RECOGNITION_CONFIDENCE))

function sanitizeCalories(calories) {
  const low = Math.max(0, Math.round(Number(calories?.low) || 0))
  const estimate = Math.max(low, Math.round(Number(calories?.estimate) || low))
  const high = Math.max(estimate, Math.round(Number(calories?.high) || estimate))
  return { low, estimate, high }
}

function sanitizeGuess(rawGuess, provider) {
  const name = String(rawGuess?.name || '').trim()
  if (!name) return null

  const calories = sanitizeCalories(rawGuess?.calories)
  const confidence = VALID_CONFIDENCE.has(rawGuess?.confidence)
    ? rawGuess.confidence
    : AI_RECOGNITION_CONFIDENCE.LOW
  const caloriesPer100Raw = Number(rawGuess?.caloriesPer100 ?? rawGuess?.caloriesPer100g)
  const caloriesPer100 = Number.isFinite(caloriesPer100Raw) && caloriesPer100Raw >= 0
    ? Math.round(caloriesPer100Raw)
    : null
  const caloriesPer100Basis = rawGuess?.caloriesPer100Basis === 'ml' ? 'ml' : 'g'
  const proteinRaw = Number(rawGuess?.protein)
  const carbohydratesRaw = Number(rawGuess?.carbohydrates)
  const fatRaw = Number(rawGuess?.fat)
  const protein = Number.isFinite(proteinRaw) && proteinRaw >= 0 ? Math.round(proteinRaw * 10) / 10 : null
  const carbohydrates = Number.isFinite(carbohydratesRaw) && carbohydratesRaw >= 0 ? Math.round(carbohydratesRaw * 10) / 10 : null
  const fat = Number.isFinite(fatRaw) && fatRaw >= 0 ? Math.round(fatRaw * 10) / 10 : null

  return {
    name,
    calories,
    caloriesPer100,
    caloriesPer100Basis,
    protein,
    carbohydrates,
    fat,
    confidence,
    provider
  }
}

export function sanitizeRecognitionResult(rawResult, provider = 'unknown') {
  const guesses = Array.isArray(rawResult?.guesses)
    ? rawResult.guesses.map(item => sanitizeGuess(item, provider)).filter(Boolean).slice(0, 4)
    : []

  return {
    provider,
    guesses
  }
}
