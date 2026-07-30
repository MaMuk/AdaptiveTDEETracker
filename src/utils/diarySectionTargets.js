export const UNSECTIONED_DIARY_SECTION_KEY = '__unsectioned__'

export function diarySectionKey(section) {
  return section || UNSECTIONED_DIARY_SECTION_KEY
}

function numericCalories(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

function distributeTargetDelta(adjustedTargets, candidateKeys, delta) {
  if (!Number.isFinite(delta) || delta === 0 || candidateKeys.length === 0) return

  const weights = candidateKeys.map(key => Math.max(0, Number(adjustedTargets[key]) || 0))
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  let distributed = 0

  for (let i = 0; i < candidateKeys.length; i += 1) {
    const key = candidateKeys[i]
    const isLast = i === candidateKeys.length - 1
    const ratio = weightSum > 0 ? (weights[i] / weightSum) : (1 / candidateKeys.length)
    const share = isLast ? (delta - distributed) : Math.round(delta * ratio)
    adjustedTargets[key] = Math.max(0, (Number(adjustedTargets[key]) || 0) + share)
    distributed += share
  }
}

export function calculateDiarySectionTargets({
  sections,
  totalDailyBudget,
  sectionPercentages,
  sectionCalories,
  closedSectionKeys = []
}) {
  const sectionKeys = (Array.isArray(sections) ? sections : []).map(section => diarySectionKey(section?.value ?? section))
  const closedKeys = new Set(Array.isArray(closedSectionKeys) ? closedSectionKeys.map(diarySectionKey) : [])
  const adjustedTargets = {}
  const consumedByKey = {}
  const candidateKeys = []
  let transferable = 0

  for (const key of sectionKeys) {
    const percentage = Number(sectionPercentages?.[key])
    const baseTarget = Math.max(0, Math.round((numericCalories(totalDailyBudget) * (Number.isFinite(percentage) ? percentage : 0)) / 100))
    const consumed = numericCalories(sectionCalories?.[key])
    adjustedTargets[key] = baseTarget
    consumedByKey[key] = consumed

    if (closedKeys.has(key)) {
      transferable += baseTarget - consumed
      adjustedTargets[key] = consumed
    } else {
      candidateKeys.push(key)
    }
  }

  distributeTargetDelta(adjustedTargets, candidateKeys, transferable)

  for (let i = 0; i < sectionKeys.length && candidateKeys.length > 0; i += 1) {
    const newlyExceededKeys = candidateKeys.filter(key => consumedByKey[key] > (Number(adjustedTargets[key]) || 0))
    if (newlyExceededKeys.length === 0) break

    let overflowDelta = 0
    for (const key of newlyExceededKeys) {
      overflowDelta -= consumedByKey[key] - (Number(adjustedTargets[key]) || 0)
      const index = candidateKeys.indexOf(key)
      if (index !== -1) candidateKeys.splice(index, 1)
    }

    distributeTargetDelta(adjustedTargets, candidateKeys, overflowDelta)
  }

  return adjustedTargets
}
