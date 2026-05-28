const UNIT_LIBRARY = Object.freeze([
  { id: 'g', label: 'g', category: 'mass', toBaseFactor: 1, systemAffinity: 'metric', enabled: true },
  { id: 'kg', label: 'kg', category: 'mass', toBaseFactor: 1000, systemAffinity: 'metric', enabled: true },
  { id: 'oz', label: 'oz', category: 'mass', toBaseFactor: 28.349523125, systemAffinity: 'imperial', enabled: true },
  { id: 'lb', label: 'lb', category: 'mass', toBaseFactor: 453.59237, systemAffinity: 'imperial', enabled: true },
  { id: 'ml', label: 'ml', category: 'volume', toBaseFactor: 1, systemAffinity: 'metric', enabled: true },
  { id: 'l', label: 'l', category: 'volume', toBaseFactor: 1000, systemAffinity: 'metric', enabled: true },
  { id: 'fl_oz', label: 'fl oz', category: 'volume', toBaseFactor: 29.5735295625, systemAffinity: 'imperial', enabled: true },
  { id: 'cup', label: 'cup', category: 'volume', toBaseFactor: 236.5882365, systemAffinity: 'imperial', enabled: true },
  { id: 'tbsp', label: 'tbsp', category: 'volume', toBaseFactor: 14.78676478125, systemAffinity: 'both', enabled: true },
  { id: 'tsp', label: 'tsp', category: 'volume', toBaseFactor: 4.92892159375, systemAffinity: 'both', enabled: true },
  { id: 'serving', label: 'serving', category: 'portion', toBaseFactor: null, systemAffinity: 'both', enabled: true }
])

const UNIT_BY_ID = Object.freeze(Object.fromEntries(UNIT_LIBRARY.map((unit) => [unit.id, unit])))
const ALIASES = Object.freeze({
  'fl oz': 'fl_oz',
  floz: 'fl_oz'
})

const UNIT_PRESETS = Object.freeze({
  metric: {
    primary: ['g', 'ml', 'serving'],
    secondary: ['kg', 'l', 'tsp', 'tbsp', 'cup']
  },
  imperial: {
    primary: ['oz', 'fl_oz', 'serving'],
    secondary: ['lb', 'cup', 'tbsp', 'tsp', 'g', 'ml']
  }
})

export { UNIT_LIBRARY, UNIT_PRESETS }

export function listEnabledUnits() {
  return UNIT_LIBRARY.filter((unit) => unit.enabled)
}

export function getUnitById(unitId) {
  const normalized = resolveUnitId(unitId)
  return normalized ? UNIT_BY_ID[normalized] || null : null
}

export function resolveUnitId(unitLike) {
  const key = String(unitLike || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!key) return null
  if (UNIT_BY_ID[key]) return key
  if (ALIASES[key]) return ALIASES[key]
  return null
}

export function formatUnitLabel(unitId) {
  return getUnitById(unitId)?.label || String(unitId || '')
}

export function getPresetUnits(system = 'metric') {
  const preset = system === 'imperial' ? UNIT_PRESETS.imperial : UNIT_PRESETS.metric
  return [...preset.primary, ...preset.secondary].filter((unitId, index, list) => list.indexOf(unitId) === index)
}

export function getPrimaryPresetUnits(system = 'metric') {
  const preset = system === 'imperial' ? UNIT_PRESETS.imperial : UNIT_PRESETS.metric
  return [...preset.primary]
}

export function convertAmountBetweenUnits(amount, fromUnitId, toUnitId) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return null
  const fromUnit = getUnitById(fromUnitId)
  const toUnit = getUnitById(toUnitId)
  if (!fromUnit || !toUnit) return null
  if (fromUnit.category !== toUnit.category) return null
  if (fromUnit.category === 'portion') return fromUnit.id === toUnit.id ? value : null
  return (value * fromUnit.toBaseFactor) / toUnit.toBaseFactor
}

export function getCanonicalDensitySuffixFromBasis(basis) {
  return basis === 'volume' ? 'kcal/100ml' : 'kcal/100g'
}
