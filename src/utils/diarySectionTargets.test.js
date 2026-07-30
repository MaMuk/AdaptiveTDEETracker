import assert from 'node:assert/strict'
import { calculateDiarySectionTargets } from './diarySectionTargets.js'

const sections = ['Breakfast', 'Lunch', 'Dinner']
const equalPercentages = {
  Breakfast: 33.333,
  Lunch: 33.333,
  Dinner: 33.334
}

{
  const targets = calculateDiarySectionTargets({
    sections: ['Breakfast', 'Lunch'],
    totalDailyBudget: 2000,
    sectionPercentages: { Breakfast: 50, Lunch: 50 },
    sectionCalories: { Breakfast: 400 }
  })

  assert.deepEqual(targets, { Breakfast: 1000, Lunch: 1000 })
}

{
  const targets = calculateDiarySectionTargets({
    sections: ['Breakfast', 'Lunch'],
    totalDailyBudget: 2000,
    sectionPercentages: { Breakfast: 50, Lunch: 50 },
    sectionCalories: { Breakfast: 600 },
    closedSectionKeys: ['Breakfast']
  })

  assert.deepEqual(targets, { Breakfast: 600, Lunch: 1400 })
}

{
  const targets = calculateDiarySectionTargets({
    sections: ['Breakfast', 'Lunch'],
    totalDailyBudget: 2000,
    sectionPercentages: { Breakfast: 50, Lunch: 50 },
    sectionCalories: { Breakfast: 1200 }
  })

  assert.deepEqual(targets, { Breakfast: 1000, Lunch: 800 })
}

{
  const targets = calculateDiarySectionTargets({
    sections,
    totalDailyBudget: 3000,
    sectionPercentages: equalPercentages,
    sectionCalories: { Breakfast: 1200, Lunch: 950 }
  })

  assert.deepEqual(targets, { Breakfast: 1000, Lunch: 900, Dinner: 850 })
}

{
  const targets = calculateDiarySectionTargets({
    sections: ['Breakfast', 'Lunch'],
    totalDailyBudget: 2000,
    sectionPercentages: { Breakfast: 50, Lunch: 50 },
    sectionCalories: { Breakfast: 2500 }
  })

  assert.deepEqual(targets, { Breakfast: 1000, Lunch: 0 })
}

{
  const targets = calculateDiarySectionTargets({
    sections,
    totalDailyBudget: 3000,
    sectionPercentages: equalPercentages,
    sectionCalories: { Breakfast: 600, Lunch: 1300 },
    closedSectionKeys: ['Breakfast']
  })

  assert.deepEqual(targets, { Breakfast: 600, Lunch: 1200, Dinner: 1100 })
}

console.log('diarySectionTargets tests passed')
