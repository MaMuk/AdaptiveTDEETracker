export const devScenarios = [
  {
    key: 'first-week-water',
    label: 'First Week Water Drop',
    buttonLabel: 'Load Scenario',
    description: '7 days, ~2.0 kg drop at ~2250 kcal/day. Useful to verify startup trust/cap avoids absurd TDEE spikes.',
    config: { startDate: '2026-01-01', days: 7, startWeight: 100, endWeight: 98, calories: 2250, weeklyRate: -0.5, goalWeight: 88, height: 182 }
  },
  {
    key: 'steady-five-weeks',
    label: 'Steady 5 Weeks',
    buttonLabel: 'Load Scenario',
    description: '35 days with moderate downward trend. Useful to confirm trust ramp shifts from baseline toward observed TDEE.',
    config: { startDate: '2026-01-01', days: 35, startWeight: 98, endWeight: 95.8, calories: 2250, weeklyRate: -0.5, goalWeight: 90, height: 180 }
  },
  {
    key: 'long-gap-new-epoch',
    label: 'Long Gap New Epoch',
    buttonLabel: 'Load Scenario',
    description: 'Two logging blocks separated by >28 days. Useful to verify current adaptation uses only the latest epoch.',
    config: { longGap: true, weeklyRate: -0.5, goalWeight: 84, height: 178 }
  },
  {
    key: 'high-confidence-rapid-loss',
    label: 'High Confidence Rapid Loss',
    buttonLabel: 'Load Scenario',
    description: '50 days with strong loss trend. Useful to inspect capped observed TDEE behavior in mature adaptation.',
    config: { startDate: '2026-01-01', days: 50, startWeight: 102, endWeight: 95, calories: 2300, weeklyRate: -0.75, goalWeight: 88, height: 184 }
  },
  {
    key: 'weight-gain-phase',
    label: 'Weight Gain Phase',
    buttonLabel: 'Load Scenario',
    description: '42 days gaining weight on a surplus. Useful to validate adaptive behavior in gain mode and calorie targets.',
    config: { startDate: '2026-01-01', days: 42, startWeight: 78, endWeight: 81, calories: 2900, weeklyRate: 0.25, goalWeight: 84, height: 176 }
  },
  {
    key: 'petite-person-cut',
    label: 'Petite Person Cut',
    buttonLabel: 'Load Scenario',
    description: 'Small body size with lower intake and gentle loss trend. Useful to validate lower-range TDEE behavior and targets.',
    config: { startDate: '2026-02-01', days: 42, startWeight: 50, endWeight: 48.9, calories: 1450, weeklyRate: -0.25, goalWeight: 46, height: 154 }
  },
  {
    key: 'elite-athlete-high-tdee',
    label: 'Elite Athlete High TDEE',
    buttonLabel: 'Load Scenario',
    description: 'High-calorie intake with stable/slight-loss trend over 8 weeks. Useful to verify that truly high TDEE can emerge at high confidence.',
    config: { startDate: '2026-01-01', days: 56, startWeight: 84, endWeight: 83.2, calories: 4100, weeklyRate: 0, goalWeight: 84, height: 186 }
  },
  {
    key: 'two-year-long-term-usage',
    label: '2-Year Long-Term Usage',
    buttonLabel: 'Load Scenario',
    description: 'Procedurally generates ~2 years of logs + diary data (4-10 entries/day), with a 6-month cut including plateaus/setbacks, then maintenance.',
    config: { longTermSim: true }
  }
]

export const devDiaryScenarios = [
  {
    key: 'balanced-day-open-sections',
    label: 'Balanced Day (All Open)',
    buttonLabel: 'Load Diary Data',
    description: 'Single day with evenly distributed meals. No closed sections.',
    config: { variant: 'balanced' }
  },
  {
    key: 'closed-sections-redistribution',
    label: 'Closed Sections Redistribution',
    buttonLabel: 'Load Diary Data',
    description: 'Two days with closed sections and over/under target behavior for redistribution checks.',
    config: { variant: 'redistribution' }
  },
  {
    key: 'historical-budget-snapshots',
    label: 'Historical Snapshot Drift Check',
    buttonLabel: 'Load Diary Data',
    description: 'Old dates include frozen budget snapshots so bars remain stable even if current TDEE changes.',
    config: { variant: 'historical' }
  },
  {
    key: 'legacy-sections-preservation',
    label: 'Legacy Sections Preservation',
    buttonLabel: 'Load Diary Data',
    description: 'Simulates renamed/removed sections after entries existed. Legacy sections should stay visible while entries exist.',
    config: { variant: 'legacy-sections' }
  }
]

function buildLogs({ startDate, days, startWeight, endWeight, calories }) {
  const out = []
  const start = new Date(startDate)
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const t = days <= 1 ? 1 : i / (days - 1)
    const weight = startWeight + ((endWeight - startWeight) * t)
    out.push({
      date: d.toISOString().slice(0, 10),
      weight: Number(weight.toFixed(2)),
      calories: Number(calories)
    })
  }
  return out
}

function buildLongGapLogs() {
  const firstEpoch = buildLogs({
    startDate: '2025-08-01',
    days: 45,
    startWeight: 96,
    endWeight: 94.8,
    calories: 2350
  })
  const secondEpoch = buildLogs({
    startDate: '2026-04-01',
    days: 14,
    startWeight: 90,
    endWeight: 89.6,
    calories: 2200
  })
  return [...firstEpoch, ...secondEpoch]
}

function makeSeededRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function formatDateKeyLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, days) {
  const out = new Date(date)
  out.setDate(out.getDate() + days)
  return out
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function sectionForMealIndex(index, totalMeals) {
  if (index === 0) return 'Breakfast'
  if (index === totalMeals - 1) return 'Snacks'
  if (index >= Math.floor(totalMeals * 0.55)) return 'Dinner'
  return 'Lunch'
}

function generateMealName(section, mealIdx, mealCount, rng) {
  const breakfast = ['Oats bowl', 'Eggs and toast', 'Greek yogurt bowl', 'Protein smoothie', 'Overnight oats']
  const lunch = ['Chicken rice bowl', 'Turkey wrap', 'Tuna salad', 'Lentil soup with bread', 'Pasta with veggies']
  const dinner = ['Grilled salmon plate', 'Lean beef stir fry', 'Chicken curry', 'Shrimp noodle bowl', 'Tofu veggie stir fry']
  const snacks = ['Protein bar', 'Fruit + nuts', 'Dark chocolate', 'Cottage cheese', 'Popcorn']
  const unsectioned = ['Coffee with milk', 'Sauce addon', 'Small dessert', 'Juice', 'Electrolyte drink']
  const map = { Breakfast: breakfast, Lunch: lunch, Dinner: dinner, Snacks: snacks, '': unsectioned }
  const list = map[section] || lunch
  const pick = list[Math.floor(rng() * list.length)]
  return mealCount > 7 ? `${pick} ${mealIdx + 1}` : pick
}

function addDiaryFixture(store, date, section, name, calories, amount = '') {
  store.addDiaryEntry(date, {
    name,
    amount,
    calories,
    section,
    usePer100g: false,
    caloriesPer100g: null
  }, { syncSuggestion: false })
}

function setDiarySnapshot(store, date, totalDailyBudget, calculatedTDEE = 2600, weeklyRate = -0.5) {
  store.upsertDiaryBudgetSnapshot(date, {
    calculatedTDEE,
    weeklyRate,
    totalDailyBudget,
    sectionPercentages: {
      __unsectioned__: 10,
      Breakfast: 20,
      Lunch: 30,
      Dinner: 30,
      Snacks: 10
    }
  })
}

function loadDiaryBalancedScenario(store) {
  const date = '2026-04-10'
  addDiaryFixture(store, date, 'Breakfast', 'Oats + Yogurt', 520, '1 bowl')
  addDiaryFixture(store, date, 'Lunch', 'Chicken Rice Bowl', 760, '1 plate')
  addDiaryFixture(store, date, 'Dinner', 'Salmon + Potatoes', 780, '1 plate')
  addDiaryFixture(store, date, 'Snacks', 'Protein Bar', 220, '1 bar')
  addDiaryFixture(store, date, '', 'Milk Coffee', 130, '300 ml')
  setDiarySnapshot(store, date, 2400, 2950, -0.5)
}

function loadDiaryRedistributionScenario(store) {
  const dateA = '2026-04-11'
  const dateB = '2026-04-12'
  addDiaryFixture(store, dateA, 'Breakfast', 'Eggs + Toast', 610, '1 serving')
  addDiaryFixture(store, dateA, 'Lunch', 'Pasta', 900, '1 plate')
  addDiaryFixture(store, dateA, 'Dinner', 'Steak + Rice', 750, '1 plate')
  addDiaryFixture(store, dateA, 'Snacks', 'Nuts', 250, '40 g')
  addDiaryFixture(store, dateA, '', 'Sauce', 90, '2 tbsp')
  setDiarySnapshot(store, dateA, 2500, 3000, -0.5)
  store.setDiaryClosedSectionsForDate(dateA, ['Breakfast', '__unsectioned__'])

  addDiaryFixture(store, dateB, 'Breakfast', 'Smoothie', 380, '500 ml')
  addDiaryFixture(store, dateB, 'Lunch', 'Turkey Wrap', 640, '1 wrap')
  addDiaryFixture(store, dateB, 'Dinner', 'Pizza', 980, '2 slices')
  addDiaryFixture(store, dateB, 'Snacks', 'Dark Chocolate', 190, '30 g')
  setDiarySnapshot(store, dateB, 2300, 2850, -0.25)
  store.setDiaryClosedSectionsForDate(dateB, ['Dinner'])
}

function loadDiaryHistoricalScenario(store) {
  const oldDate = '2025-01-15'
  const recentDate = '2026-04-13'
  addDiaryFixture(store, oldDate, 'Breakfast', 'Bagel + Cream Cheese', 540, '1 serving')
  addDiaryFixture(store, oldDate, 'Lunch', 'Burger', 890, '1 burger')
  addDiaryFixture(store, oldDate, 'Dinner', 'Pasta Bolognese', 860, '1 plate')
  addDiaryFixture(store, oldDate, 'Snacks', 'Ice Cream', 280, '1 cup')
  addDiaryFixture(store, oldDate, '', 'Latte', 160, '1 cup')
  setDiarySnapshot(store, oldDate, 3100, 3600, 0.25)
  store.setDiaryClosedSectionsForDate(oldDate, ['Dinner'])

  addDiaryFixture(store, recentDate, 'Breakfast', 'Skyr Bowl', 360, '1 bowl')
  addDiaryFixture(store, recentDate, 'Lunch', 'Soup + Bread', 520, '1 serving')
  addDiaryFixture(store, recentDate, 'Dinner', 'Chicken Stir Fry', 690, '1 plate')
  addDiaryFixture(store, recentDate, 'Snacks', 'Fruit', 140, '1 serving')
  setDiarySnapshot(store, recentDate, 2100, 2600, -0.5)
}

function loadDiaryLegacySectionsScenario(store) {
  const dateWithLegacy = '2026-04-14'
  const dateWithoutLegacy = '2026-04-15'

  addDiaryFixture(store, dateWithLegacy, 'Breakfast', 'Egg Muffin', 430, '1 serving')
  addDiaryFixture(store, dateWithLegacy, 'Lunch', 'Rice Bowl', 710, '1 bowl')
  addDiaryFixture(store, dateWithLegacy, 'Snacks', 'Protein Cookie', 240, '1 piece')
  addDiaryFixture(store, dateWithLegacy, 'Late Snack', 'Yogurt Cup', 180, '1 cup')
  addDiaryFixture(store, dateWithLegacy, '', 'Coffee', 90, '1 cup')

  addDiaryFixture(store, dateWithoutLegacy, 'Breakfast', 'Toast + Jam', 350, '1 serving')
  addDiaryFixture(store, dateWithoutLegacy, 'Lunch', 'Chicken Salad', 620, '1 bowl')
  addDiaryFixture(store, dateWithoutLegacy, 'Dinner', 'Fish + Potatoes', 760, '1 plate')
  addDiaryFixture(store, dateWithoutLegacy, '', 'Sparkling Water', 0, '500 ml')

  store.setDiarySections(['Morning', 'Lunch', 'Dinner'])
  store.setDiarySectionPercentage('__unsectioned__', 12)
  store.setDiarySectionPercentage('Morning', 22)
  store.setDiarySectionPercentage('Lunch', 33)
  store.setDiarySectionPercentage('Dinner', 33)

  setDiarySnapshot(store, dateWithLegacy, 2350, 2850, -0.4)
  setDiarySnapshot(store, dateWithoutLegacy, 2250, 2750, -0.4)
  store.setDiaryClosedSectionsForDate(dateWithLegacy, ['Late Snack'])
}

function applyLongTermSimulationScenario(store, notify) {
  const today = new Date()
  const totalDays = 730
  const startDate = addDays(today, -(totalDays - 1))
  const lossDays = 182
  const startWeight = 108.4
  const goalWeight = 88.0
  const height = 181
  const rng = makeSeededRng(Number(formatDateKeyLocal(today).replaceAll('-', '')))

  store.setFoodDiaryEnabled(true)
  store.setDiarySections(['Breakfast', 'Lunch', 'Dinner', 'Snacks'])
  store.setDiarySectionPercentage('__unsectioned__', 8)
  store.setDiarySectionPercentage('Breakfast', 22)
  store.setDiarySectionPercentage('Lunch', 30)
  store.setDiarySectionPercentage('Dinner', 30)
  store.setDiarySectionPercentage('Snacks', 10)
  store.foodDiaryEntries = []
  store.diaryClosedSectionsByDate = {}
  store.diaryBudgetSnapshotsByDate = {}

  const logs = []
  for (let day = 0; day < totalDays; day += 1) {
    const dateObj = addDays(startDate, day)
    const dateKey = formatDateKeyLocal(dateObj)
    const inLossPhase = day < lossDays
    const progress = inLossPhase ? (day / (lossDays - 1)) : 1

    let trendWeight = startWeight - ((startWeight - goalWeight) * progress)
    if (inLossPhase) {
      const plateauFactor = day >= 60 && day < 105 ? 0.45 : 1
      const setbackPulse = (day % 24 >= 18 && day % 24 <= 20) ? (0.35 + rng() * 0.4) : 0
      const cyclicalWater = Math.sin(day / 6) * 0.28
      trendWeight = startWeight - ((startWeight - goalWeight) * progress * plateauFactor) + cyclicalWater + setbackPulse
      if (day >= 105) {
        const resumedProgress = (day - 105) / (lossDays - 105)
        trendWeight = (startWeight - ((startWeight - goalWeight) * (0.42 + 0.58 * resumedProgress))) + cyclicalWater + setbackPulse * 0.7
      }
    } else {
      const maintenanceNoise = Math.sin(day / 9) * 0.35 + (rng() - 0.5) * 0.4
      const periodicBump = day % 35 === 0 ? 0.6 : 0
      trendWeight = goalWeight + maintenanceNoise + periodicBump
    }
    const weight = Number(clamp(trendWeight, goalWeight - 2.2, startWeight + 1.5).toFixed(2))

    const maintenanceBudget = 2650 + Math.sin(day / 50) * 80
    const deficit = inLossPhase ? 560 - Math.min(220, day / 2.8) : 0
    const adherenceDrift = (rng() - 0.5) * (inLossPhase ? 320 : 260)
    const occasionalOvereat = day % 17 === 0 ? 280 + rng() * 320 : 0
    const dailyCalories = Math.round(clamp(maintenanceBudget - deficit + adherenceDrift + occasionalOvereat, 1600, 3400))
    logs.push({ date: dateKey, weight, calories: dailyCalories })

    const mealCount = 4 + Math.floor(rng() * 7)
    let remaining = dailyCalories
    for (let mealIdx = 0; mealIdx < mealCount; mealIdx += 1) {
      const mealsLeft = mealCount - mealIdx
      const minForMeal = 110
      const maxForMeal = clamp(Math.round(remaining / Math.max(1, mealsLeft - 1)), 180, 950)
      const raw = mealIdx === mealCount - 1
        ? remaining
        : Math.round(clamp(minForMeal + rng() * (maxForMeal - minForMeal), minForMeal, maxForMeal))
      const mealCalories = Math.max(80, Math.min(remaining - (mealsLeft - 1) * 80, raw))
      remaining -= mealCalories

      const sectionRoll = rng()
      const section = sectionRoll < 0.08 ? '' : sectionForMealIndex(mealIdx, mealCount)
      const name = generateMealName(section, mealIdx, mealCount, rng)
      const amount = section === 'Breakfast' ? '1 serving'
        : section === 'Lunch' || section === 'Dinner' ? '1 plate'
          : section === 'Snacks' ? '1 portion' : '1 cup'

      store.addDiaryEntry(dateKey, {
        name,
        amount,
        calories: mealCalories,
        section,
        usePer100g: false,
        caloriesPer100g: null
      }, { syncSuggestion: false })
    }

    const dailyRate = inLossPhase ? -0.6 : 0
    const snapshotBudget = Math.round((maintenanceBudget + (dailyRate * 7700) / 7) / 25) * 25
    store.upsertDiaryBudgetSnapshot(dateKey, {
      calculatedTDEE: Math.round(maintenanceBudget),
      weeklyRate: dailyRate,
      totalDailyBudget: Math.max(1400, snapshotBudget),
      sectionPercentages: {
        __unsectioned__: 8,
        Breakfast: 22,
        Lunch: 30,
        Dinner: 30,
        Snacks: 10
      }
    })

    const closed = []
    if (mealCount >= 6 && rng() > 0.35) closed.push('Breakfast')
    if (mealCount >= 7 && rng() > 0.45) closed.push('Lunch')
    if (rng() > 0.5) closed.push('Dinner')
    if (rng() > 0.7) closed.push('Snacks')
    if (rng() > 0.8) closed.push('__unsectioned__')
    store.setDiaryClosedSectionsForDate(dateKey, closed)
  }

  store.logs = logs
  store.startWeight = startWeight
  store.goalWeight = goalWeight
  store.height = height
  store.weeklyRate = 0
  store.updateTDEE()

  notify(`Loaded DEV scenario: 2-Year Long-Term Usage (${totalDays} days)`)
}

export function applyDevScenario({ scenario, store, notify }) {
  const { config } = scenario
  if (config.longTermSim) {
    applyLongTermSimulationScenario(store, notify)
    return
  }

  const logs = config.longGap ? buildLongGapLogs() : buildLogs(config)
  store.logs = logs
  store.startWeight = logs.length > 0 ? logs[0].weight : null
  store.goalWeight = Number(config.goalWeight ?? store.goalWeight ?? (store.startWeight ? store.startWeight - 8 : 80))
  store.height = Number(config.height ?? store.height ?? 178)
  store.weeklyRate = config.weeklyRate ?? store.weeklyRate
  store.updateTDEE()
  notify(`Loaded DEV scenario: ${scenario.label}`)
}

export function applyDevDiaryScenario({ scenario, store, notify }) {
  const baseSections = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
  store.setFoodDiaryEnabled(true)
  store.setDiarySections(baseSections)
  store.setDiarySectionPercentage('__unsectioned__', 10)
  store.setDiarySectionPercentage('Breakfast', 20)
  store.setDiarySectionPercentage('Lunch', 30)
  store.setDiarySectionPercentage('Dinner', 30)
  store.setDiarySectionPercentage('Snacks', 10)

  store.foodDiaryEntries = []
  store.diaryClosedSectionsByDate = {}
  store.diaryBudgetSnapshotsByDate = {}

  if (scenario.config.variant === 'balanced') {
    loadDiaryBalancedScenario(store)
  } else if (scenario.config.variant === 'redistribution') {
    loadDiaryRedistributionScenario(store)
  } else if (scenario.config.variant === 'historical') {
    loadDiaryHistoricalScenario(store)
  } else if (scenario.config.variant === 'legacy-sections') {
    loadDiaryLegacySectionsScenario(store)
  }

  notify(`Loaded DEV diary scenario: ${scenario.label}`)
}
