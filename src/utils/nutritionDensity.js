export function normalizeDensityFields(source) {
  const densityMode = source?.densityMode === 'per100' ? 'per100' : 'none'
  const basisRaw = String(source?.densityBasis || '').trim().toLowerCase()
  const densityBasis = basisRaw === 'volume' ? 'volume' : 'mass'
  const canonicalRaw = Number(source?.densityKcalPer100Canonical)

  if (densityMode === 'per100' && Number.isFinite(canonicalRaw) && canonicalRaw >= 0) {
    return {
      densityMode: 'per100',
      densityBasis,
      densityKcalPer100Canonical: canonicalRaw
    }
  }

  // Legacy compatibility: usePer100g + caloriesPer100g
  const legacyUsePer100 = Boolean(source?.usePer100g)
  const legacyValue = Number(source?.caloriesPer100g)
  if (legacyUsePer100 && Number.isFinite(legacyValue) && legacyValue >= 0) {
    return {
      densityMode: 'per100',
      densityBasis: 'mass',
      densityKcalPer100Canonical: legacyValue
    }
  }

  return {
    densityMode: 'none',
    densityBasis: 'mass',
    densityKcalPer100Canonical: null
  }
}

export function withLegacyDensityFields(item) {
  const density = normalizeDensityFields(item)
  const usePer100g = density.densityMode === 'per100' && density.densityBasis === 'mass'
  return {
    ...item,
    ...density,
    usePer100g,
    caloriesPer100g: usePer100g ? density.densityKcalPer100Canonical : null
  }
}
