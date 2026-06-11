export function toNullableMacro(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null
}

export function isLegacyUntrackedMacroTriplet(entry) {
  const protein = toNullableMacro(entry?.protein)
  const carbohydrates = toNullableMacro(entry?.carbohydrates)
  const fat = toNullableMacro(entry?.fat)
  return protein === 0 && carbohydrates === 0 && fat === 0
}

export function hasTrackedMacroValueForEntry(entry, key) {
  if (isLegacyUntrackedMacroTriplet(entry)) return false
  const value = entry?.[key]
  if (value === null || value === undefined || value === '') return false
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0
}

export function macroTotalFromEntry(entry, key) {
  if (!hasTrackedMacroValueForEntry(entry, key)) return null
  const numeric = Number(entry?.[key])
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null
}
