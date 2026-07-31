<template>
  <q-page padding>
    <!-- Weekly Statistics Table -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          Weekly Statistics
        </div>
        <q-table
          :rows="weeklyStats"
          :columns="weeklyColumns"
          row-key="week"
          flat
          bordered
          dense
          :pagination="{ rowsPerPage: 10 }"
          class="mobile-optimized-table"
        >
          <template #body-cell-delta="props">
            <q-td :props="props">
              <span :class="getDeltaClass(props.row.delta)">
                {{ props.row.delta }}
              </span>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Shared Chart Range -->
    <q-card class="q-mb-md">
      <q-card-section class="chart-range-card">
        <div class="chart-range-row">
          <div class="chart-range-label">
            range
          </div>
          <div class="chart-range-links">
            <button
              v-for="preset in chartRangePresets"
              :key="preset.value"
              type="button"
              class="chart-range-link"
              :class="{ 'chart-range-link--active': chartRangePreset === preset.value }"
              @click="chartRangePreset = preset.value"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
        <div class="chart-range-row">
          <div class="chart-range-label">
            group
          </div>
          <div class="chart-range-links">
            <button
              v-for="option in chartGroupingOptions"
              :key="option.value"
              type="button"
              class="chart-range-link chart-range-link--wide"
              :class="{ 'chart-range-link--active': chartGrouping === option.value }"
              @click="chartGrouping = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Weight Tracking Chart -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6">
            Weight Tracking
          </div>
          <q-btn-toggle
            v-model="chartZoom"
            toggle-color="dark"
            toggle-text-color="white"
            :options="[
              {value: 'tracked', icon: 'monitor_weight', color: 'cyan-4', toggleTextColor: 'cyan-4'},
              {value: 'trend', icon: 'trending_up', color: 'purple-4', toggleTextColor: 'purple-4'},
              {value: 'full', icon: 'sports_score', color: 'amber-4', toggleTextColor: 'amber-4'}
            ]"
            dense
          />
        </div>
        <div
          v-if="hasWeightData"
          style="position: relative; height: 300px;"
        >
          <Line
            :data="weightChartData"
            :options="weightChartOptions"
          />
        </div>
        <div
          v-else
          class="text-center text-grey-7 q-pa-lg"
        >
          No weight data available yet
        </div>
      </q-card-section>
    </q-card>

    <!-- Diary Macro Composition Chart -->
    <q-card
      v-if="showMacroCompositionChart"
      class="q-mb-md"
    >
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6">
            Tracked Macro Composition
          </div>
          <q-btn-toggle
            v-model="macroCompositionMode"
            toggle-color="dark"
            toggle-text-color="white"
            :options="[
              {value: 'calories', icon: 'local_fire_department', color: 'deep-orange-5', toggleTextColor: 'deep-orange-5'},
              {value: 'grams', icon: 'scale', color: 'blue-grey-5', toggleTextColor: 'blue-grey-5'}
            ]"
            dense
          />
        </div>
        <div
          v-if="hasMacroCompositionData"
          style="position: relative; height: 320px;"
        >
          <Bar
            :data="macroCompositionChartData"
            :options="macroCompositionChartOptions"
          />
        </div>
        <div
          v-else
          class="text-center text-grey-7 q-pa-lg"
        >
          {{ hasAnyMacroCompositionData ? 'No diary macro data available for this range' : 'No diary macro data available yet' }}
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '../stores/user'
import { addDays, diffDays, formatDateKeyLocal, parseDateKey, todayKey } from '../utils/dateKey'
import { convertWeeklyRateKg, kgToLb } from '../utils/bodyUnits'
import { macroTotalFromEntry } from '../utils/diaryMacros'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

const chartZoom = ref('tracked')
const macroCompositionMode = ref('calories')
const chartRangePreset = ref('4w')
const chartGrouping = ref('daily')
const chartRangePresets = [
  { value: '7d', label: '7d' },
  { value: '4w', label: '4w' },
  { value: '4m', label: '4m' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'all' }
]
const chartGroupingOptions = [
  { value: 'daily', label: 'daily' },
  { value: 'weekly', label: 'weekly' },
  { value: 'monthly', label: 'monthly' }
]
const MACRO_CALORIES_PER_GRAM = {
  protein: 4,
  carbohydrates: 4,
  fat: 9
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const store = useUserStore()
const profileMeasurementSystem = computed(() => store.profileMeasurementSystem || 'metric')
const bodyWeightUnitLabel = computed(() => profileMeasurementSystem.value === 'imperial' ? 'lb' : 'kg')
const macroCompositionUnitLabel = computed(() => macroCompositionMode.value === 'grams' ? 'g' : 'kcal')
const chartGroupingAxisLabel = computed(() => {
  if (chartGrouping.value === 'weekly') return 'Week'
  if (chartGrouping.value === 'monthly') return 'Month'
  return 'Date'
})

const weeklyColumns = [
  { name: 'delta', label: 'Δ Week', field: 'delta', align: 'center', sortable: true, style: 'width: 25%' },
  { name: 'avgWeight', label: 'x̄ Weight', field: 'avgWeight', align: 'center', sortable: true, style: 'width: 20%' },
  { name: 'avgCalories', label: 'x̄ Calories', field: 'avgCalories', align: 'center', sortable: true, style: 'width: 25%' },
  { name: 'week', label: 'Week', field: 'week', align: 'left', sortable: true, style: 'width: 30%' }
]

const weeklyStats = computed(() => {
  if (!store.logs || store.logs.length === 0) return []

  const sortedLogs = [...store.logs].sort((a, b) => a.date.localeCompare(b.date))
  
  const weekGroups = {}
  
  sortedLogs.forEach(log => {
    const date = parseDateKey(log.date)
    const weekStart = getWeekStart(date)
    const weekKey = formatDateKeyLocal(weekStart)
    
    if (!weekGroups[weekKey]) {
      weekGroups[weekKey] = []
    }
    
    weekGroups[weekKey].push(log)
  })

  const stats = []
  const weekKeys = Object.keys(weekGroups).sort()

  weekKeys.forEach((weekKey, index) => {
    const logs = weekGroups[weekKey]
    
    const weightsWithData = logs.filter(l => l.weight)
    const avgWeight = weightsWithData.length > 0
      ? weightsWithData.reduce((sum, l) => sum + l.weight, 0) / weightsWithData.length
      : null
    const caloriesWithData = logs.filter(l => l.calories)
    const avgCalories = caloriesWithData.length > 0
      ? caloriesWithData.reduce((sum, l) => sum + l.calories, 0) / caloriesWithData.length
      : null

    let delta = '—'
    if (index > 0 && avgWeight !== null) {
      const prevWeekLogs = weekGroups[weekKeys[index - 1]]
      const prevWeightsWithData = prevWeekLogs.filter(l => l.weight)
      
      if (prevWeightsWithData.length > 0) {
        const prevAvgWeight = prevWeightsWithData.reduce((sum, l) => sum + l.weight, 0) / prevWeightsWithData.length
        const change = avgWeight - prevAvgWeight
        const prefix = change >= 0 ? '+' : ''
        const display = Number(convertWeeklyRateKg(change, profileMeasurementSystem.value))
        delta = `${prefix}${display.toFixed(2)} ${bodyWeightUnitLabel.value}`
      }
    }

    const weekStart = parseDateKey(weekKey)
    
    stats.push({
      week: formatDateShort(weekStart),
      avgWeight: avgWeight ? `${Number(convertWeeklyRateKg(avgWeight, profileMeasurementSystem.value)).toFixed(1)} ${bodyWeightUnitLabel.value}` : '—',
      avgCalories: avgCalories ? Math.round(avgCalories) : '—',
      delta: delta,
      rawDelta: delta === '—' ? 0 : parseFloat(delta)
    })
  })

  return stats.reverse()
})

function getWeekStart(date) {
  const d = date instanceof Date ? new Date(date) : parseDateKey(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function formatDateShort(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = date instanceof Date ? date : parseDateKey(date)
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function formatMonthShort(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = date instanceof Date ? date : parseDateKey(date)
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

function getDeltaClass(delta) {
  if (delta === '—' || !store.weeklyRate) return 'text-grey-7'
  
  const value = parseFloat(delta)
  
  if (store.weeklyRate < 0) {
    return value <= 0 ? 'text-positive' : 'text-negative'
  } else if (store.weeklyRate > 0) {
    return value >= 0 ? 'text-positive' : 'text-negative'
  }
  
  return 'text-grey-7'
}

function getChartRangeStartDate(anchorDate, firstDate) {
  if (chartRangePreset.value === 'all') return new Date(firstDate)

  const startDate = new Date(anchorDate)
  if (chartRangePreset.value === '7d') {
    startDate.setDate(startDate.getDate() - 6)
  } else if (chartRangePreset.value === '4w') {
    startDate.setDate(startDate.getDate() - 27)
  } else if (chartRangePreset.value === '4m') {
    startDate.setMonth(startDate.getMonth() - 4)
  } else if (chartRangePreset.value === '1y') {
    startDate.setFullYear(startDate.getFullYear() - 1)
  }

  return startDate > firstDate ? startDate : new Date(firstDate)
}

function getChartPeriodStart(date, grouping) {
  const d = date instanceof Date ? new Date(date) : parseDateKey(date)
  if (grouping === 'weekly') return getWeekStart(d)
  if (grouping === 'monthly') {
    d.setDate(1)
    return d
  }
  return d
}

function formatChartLabel(date, grouping) {
  if (grouping === 'monthly') return formatMonthShort(date)
  if (grouping === 'weekly') return formatDateShort(date)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function averageFinite(values) {
  const finiteValues = values.filter(value => Number.isFinite(value))
  if (finiteValues.length === 0) return null
  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
}

function groupChartSeries(dates, seriesList) {
  if (chartGrouping.value === 'daily') {
    return {
      labels: dates.map(date => formatChartLabel(date, chartGrouping.value)),
      series: seriesList
    }
  }

  const groups = []
  const groupIndexes = new Map()
  dates.forEach((date, index) => {
    const periodStart = getChartPeriodStart(date, chartGrouping.value)
    const periodKey = formatDateKeyLocal(periodStart)
    let groupIndex = groupIndexes.get(periodKey)

    if (groupIndex === undefined) {
      groupIndex = groups.length
      groupIndexes.set(periodKey, groupIndex)
      groups.push({
        periodStart,
        indexes: []
      })
    }

    groups[groupIndex].indexes.push(index)
  })

  return {
    labels: groups.map(group => formatChartLabel(group.periodStart, chartGrouping.value)),
    series: seriesList.map(series => {
      return groups.map(group => averageFinite(group.indexes.map(index => series[index])))
    })
  }
}

const hasWeightData = computed(() => {
  return store.logs && store.logs.some(log => log.weight)
})

const showMacroCompositionChart = computed(() => Boolean(store.foodDiaryEnabled && store.diaryMacroTrackingEnabled))
const macroCompositionRows = computed(() => {
  if (!showMacroCompositionChart.value || !Array.isArray(store.foodDiaryEntries)) return []

  const days = new Map()
  for (const entry of store.foodDiaryEntries) {
    const date = String(entry.date || '').trim()
    if (!date) continue

    const row = days.get(date) || {
      date,
      calories: 0,
      proteinGrams: 0,
      carbohydratesGrams: 0,
      fatGrams: 0
    }

    const totalCalories = Number(entry.calories)
    if (Number.isFinite(totalCalories) && totalCalories > 0) {
      row.calories += totalCalories
    }
    row.proteinGrams += getEntryMacroGrams(entry, 'protein')
    row.carbohydratesGrams += getEntryMacroGrams(entry, 'carbohydrates')
    row.fatGrams += getEntryMacroGrams(entry, 'fat')
    days.set(date, row)
  }

  return [...days.values()]
    .filter(row => {
      return row.calories > 0 || row.proteinGrams + row.carbohydratesGrams + row.fatGrams > 0
    })
    .sort((a, b) => a.date.localeCompare(b.date))
})
const rangedMacroCompositionRows = computed(() => {
  if (macroCompositionRows.value.length === 0) return []

  const firstDate = parseDateKey(macroCompositionRows.value[0].date)
  const lastDate = parseDateKey(macroCompositionRows.value[macroCompositionRows.value.length - 1].date)
  const startDateKey = formatDateKeyLocal(getChartRangeStartDate(lastDate, firstDate))
  return macroCompositionRows.value.filter(row => row.date >= startDateKey)
})
const visibleMacroCompositionRows = computed(() => {
  const groupedRows = groupMacroCompositionRows(rangedMacroCompositionRows.value)

  if (macroCompositionMode.value === 'grams') {
    return groupedRows
      .filter(row => {
        return row.proteinGrams + row.carbohydratesGrams + row.fatGrams > 0
      })
      .map(row => ({
        ...row,
        protein: row.proteinGrams,
        carbohydrates: row.carbohydratesGrams,
        fat: row.fatGrams
      }))
  }

  return groupedRows
    .filter(row => row.calories > 0)
    .map(normalizeMacroCalorieRow)
})
const hasMacroCompositionData = computed(() => visibleMacroCompositionRows.value.length > 0)
const hasAnyMacroCompositionData = computed(() => macroCompositionRows.value.length > 0)
const macroCompositionChartData = computed(() => ({
  labels: visibleMacroCompositionRows.value.map(row => row.label),
  datasets: [
    {
      label: 'Protein',
      data: visibleMacroCompositionRows.value.map(row => row.protein),
      backgroundColor: '#e53935',
      borderWidth: 0,
      stack: 'macros'
    },
    {
      label: 'Carbohydrates',
      data: visibleMacroCompositionRows.value.map(row => row.carbohydrates),
      backgroundColor: '#fbc02d',
      borderWidth: 0,
      stack: 'macros'
    },
    {
      label: 'Fat',
      data: visibleMacroCompositionRows.value.map(row => row.fat),
      backgroundColor: '#43a047',
      borderWidth: 0,
      stack: 'macros'
    },
    ...(macroCompositionMode.value === 'calories' ? [{
      label: 'Untracked calories',
      data: visibleMacroCompositionRows.value.map(row => row.untracked),
      backgroundColor: '#9e9e9e',
      borderWidth: 0,
      stack: 'macros'
    }] : [])
  ]
}))

function groupMacroCompositionRows(rows) {
  if (chartGrouping.value === 'daily') {
    return rows.map(row => ({
      ...row,
      label: formatDateShort(parseDateKey(row.date))
    }))
  }

  const groups = new Map()
  for (const row of rows) {
    const periodStart = getChartPeriodStart(parseDateKey(row.date), chartGrouping.value)
    const periodKey = formatDateKeyLocal(periodStart)
    const group = groups.get(periodKey) || {
      date: periodKey,
      label: formatChartLabel(periodStart, chartGrouping.value),
      calories: 0,
      proteinGrams: 0,
      carbohydratesGrams: 0,
      fatGrams: 0
    }

    group.calories += row.calories
    group.proteinGrams += row.proteinGrams
    group.carbohydratesGrams += row.carbohydratesGrams
    group.fatGrams += row.fatGrams
    groups.set(periodKey, group)
  }

  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function getEntryMacroGrams(entry, key) {
  const grams = macroTotalFromEntry(entry, key)
  if (!Number.isFinite(grams) || grams < 0) return 0
  return grams
}

function normalizeMacroCalorieRow(row) {
  const protein = row.proteinGrams * MACRO_CALORIES_PER_GRAM.protein
  const carbohydrates = row.carbohydratesGrams * MACRO_CALORIES_PER_GRAM.carbohydrates
  const fat = row.fatGrams * MACRO_CALORIES_PER_GRAM.fat
  const macroCalories = protein + carbohydrates + fat
  if (macroCalories > row.calories && macroCalories > 0) {
    const scale = row.calories / macroCalories
    return {
      ...row,
      protein: protein * scale,
      carbohydrates: carbohydrates * scale,
      fat: fat * scale,
      untracked: 0
    }
  }

  return {
    ...row,
    protein,
    carbohydrates,
    fat,
    untracked: Math.max(0, row.calories - macroCalories)
  }
}

const weightChartData = computed(() => {
  if (!store.logs || store.logs.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  const sortedLogs = [...store.logs]
    .filter(log => log.weight)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sortedLogs.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  const firstDateKey = sortedLogs[0].date
  const lastLogDateKey = sortedLogs[sortedLogs.length - 1].date
  const firstDate = parseDateKey(firstDateKey)
  const lastLogDate = parseDateKey(lastLogDateKey)
  const rangeStartDate = getChartRangeStartDate(lastLogDate, firstDate)
  
  let goalDate = new Date(lastLogDate)
  if (store.averageWeight && store.goalWeight && store.weeklyRate !== undefined) {
    const diff = Math.abs(store.goalWeight - store.averageWeight)
    const rate = Math.abs(store.weeklyRate)
    
    if (rate > 0) {
      const weeks = diff / rate
      const days = Math.round(weeks * 7)
      goalDate = parseDateKey(addDays(todayKey(), days))
    }
  }

  const trendEndDate = new Date(lastLogDate)
  trendEndDate.setDate(trendEndDate.getDate() + 14)

  let endDate
  if (chartZoom.value === 'full') {
    endDate = goalDate
  } else if (chartZoom.value === 'trend') {
    endDate = trendEndDate
  } else {
    endDate = lastLogDate
  }

  const allDates = []
  let currentDate = new Date(rangeStartDate)
  
  while (currentDate <= endDate) {
    allDates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  const weights = allDates.map(date => {
    const dateKey = formatDateKeyLocal(date)
    const log = sortedLogs.find(l => {
      return l.date === dateKey
    })
    if (!log) return null
    return profileMeasurementSystem.value === 'imperial' ? kgToLb(log.weight) : log.weight
  })

  const goalLine = []
  if (store.startWeight && store.weeklyRate !== undefined) {
    allDates.forEach(date => {
      const daysDiff = (date - firstDate) / (1000 * 60 * 60 * 24)
      const weeksDiff = daysDiff / 7
      const expectedWeightKg = store.startWeight + (store.weeklyRate * weeksDiff)
      const expectedWeight = profileMeasurementSystem.value === 'imperial' ? kgToLb(expectedWeightKg) : expectedWeightKg
      goalLine.push(expectedWeight)
    })
  }

  const trendLine = calculateTrendLineExtended(sortedLogs, allDates, firstDate, trendEndDate, profileMeasurementSystem.value)
  const groupedChartData = groupChartSeries(allDates, [weights, trendLine, goalLine])
  const [groupedWeights, groupedTrendLine, groupedGoalLine] = groupedChartData.series

  const datasets = [
    {
      label: 'Weight',
      data: groupedWeights,
      borderColor: '#4dd0e1', // .bg-cyan-4
      backgroundColor: '#2b7d88',
      tension: 0.1,
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 6,
      spanGaps: true
    }
  ]



  if (groupedTrendLine.some(value => value !== null)) {
    datasets.push({
      label: 'Trend Estimate',
      data: groupedTrendLine,
      borderColor: '#ba68c8', //.bg-purple-4
      borderDash: [5, 5],
      tension: 0,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0
    })
  }

  if (groupedGoalLine.some(value => value !== null)) {
    datasets.push({
      label: 'Set Goal',
      data: groupedGoalLine,
      borderColor: '#ffd54f', //.bg-amber-4
      tension: 0,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0
    })
  }

  return {
    labels: groupedChartData.labels,
    datasets
  }
})

function calculateTrendLineExtended(logs, allDates, firstDate, trendEndDate, bodySystem) {
  if (logs.length < 2) return []

  const firstDateTime = firstDate.getTime()
  const firstDateKey = formatDateKeyLocal(firstDate)
  
  const points = logs.map(log => ({
    x: diffDays(firstDateKey, log.date),
    y: log.weight
  }))

  // Calculate linear regression
  const n = points.length
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0

  points.forEach(point => {
    sumX += point.x
    sumY += point.y
    sumXY += point.x * point.y
    sumXX += point.x * point.x
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Generate trend line points for all dates, but only up to trendEndDate
  return allDates.map(date => {
    // Only show trend line up to 14 days in the future
    if (date > trendEndDate) {
      return null
    }
    const daysSinceStart = (date.getTime() - firstDateTime) / (1000 * 60 * 60 * 24)
    const valueKg = slope * daysSinceStart + intercept
    return bodySystem === 'imperial' ? kgToLb(valueKg) : valueKg
  })
}

const weightChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top'
    },
    tooltip: {
      mode: 'index',
      intersect: false
    }
  },
  scales: {
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: `Weight (${bodyWeightUnitLabel.value})`
      },
      ticks: {
        callback: function(value) {
          return value.toFixed(1)
        }
      }
    },
    x: {
      title: {
        display: true,
        text: chartGroupingAxisLabel.value
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  }
}))

const macroCompositionChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top'
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context) {
          const value = Number(context.parsed.y) || 0
          return `${context.dataset.label}: ${Math.round(value)} ${macroCompositionUnitLabel.value}`
        },
        footer: function(items) {
          const total = items.reduce((sum, item) => sum + (Number(item.parsed.y) || 0), 0)
          return `Total: ${Math.round(total)} ${macroCompositionUnitLabel.value}`
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      title: {
        display: true,
        text: chartGroupingAxisLabel.value
      }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      title: {
        display: true,
        text: macroCompositionMode.value === 'grams' ? 'Macros (g)' : 'Calories (kcal)'
      },
      ticks: {
        callback: function(value) {
          return Math.round(value)
        }
      }
    }
  },
  interaction: {
    mode: 'index',
    intersect: false
  }
}))
</script>

<style scoped>
.mobile-optimized-table {
  font-size: 0.875rem;
}

.mobile-optimized-table :deep(th) {
  font-size: 0.75rem;
  padding: 8px 4px;
  white-space: nowrap;
}

.mobile-optimized-table :deep(td) {
  padding: 8px 4px;
  font-size: 0.875rem;
}

.chart-range-card {
  align-items: stretch;
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  padding-bottom: 8px;
  padding-top: 8px;
}

.chart-range-row {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.chart-range-label {
  color: #546e7a;
  font-size: 0.875rem;
  min-width: 42px;
  text-align: right;
}

.chart-range-links {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 0;
  flex-wrap: wrap;
}

.chart-range-link {
  appearance: none;
  background: transparent;
  border: 0;
  color: #546e7a;
  cursor: pointer;
  font: inherit;
  min-height: 40px;
  min-width: 48px;
  padding: 8px 12px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.chart-range-link--wide {
  min-width: 72px;
}

.chart-range-link--active {
  color: #000;
  font-weight: 600;
  text-decoration-thickness: 2px;
}

/* Make table more compact on smaller screens */
@media (max-width: 600px) {
  .mobile-optimized-table {
    font-size: 0.8rem;
  }
  
  .mobile-optimized-table :deep(th) {
    font-size: 0.7rem;
    padding: 6px 2px;
  }
  
  .mobile-optimized-table :deep(td) {
    padding: 6px 2px;
  }
}
</style>
