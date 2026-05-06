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
  const caloriesPer100gRaw = Number(rawGuess?.caloriesPer100g)
  const caloriesPer100g = Number.isFinite(caloriesPer100gRaw) && caloriesPer100gRaw >= 0
    ? Math.round(caloriesPer100gRaw)
    : null

  return {
    name,
    calories,
    caloriesPer100g,
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
