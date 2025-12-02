<template>
  <q-page padding>
    <!-- Weekly Statistics Table -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Weekly Statistics</div>
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
          <template v-slot:body-cell-delta="props">
            <q-td :props="props">
              <span :class="getDeltaClass(props.row.delta)">
                {{ props.row.delta }}
              </span>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Weight Tracking Chart -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6">Weight Tracking</div>
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
        <div v-if="hasWeightData" style="position: relative; height: 300px;">
          <Line :data="weightChartData" :options="weightChartOptions" />
        </div>
        <div v-else class="text-center text-grey-7 q-pa-lg">
          No weight data available yet
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '../stores/user'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

const chartZoom = ref('tracked')

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const store = useUserStore()

const weeklyColumns = [
  { name: 'delta', label: 'Δ Week', field: 'delta', align: 'center', sortable: true, style: 'width: 25%' },
  { name: 'avgWeight', label: 'x̄ Weight', field: 'avgWeight', align: 'center', sortable: true, style: 'width: 20%' },
  { name: 'avgCalories', label: 'x̄ Calories', field: 'avgCalories', align: 'center', sortable: true, style: 'width: 25%' },
  { name: 'week', label: 'Week', field: 'week', align: 'left', sortable: true, style: 'width: 30%' }
]

const weeklyStats = computed(() => {
  if (!store.logs || store.logs.length === 0) return []

  const sortedLogs = [...store.logs].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  const weekGroups = {}
  
  sortedLogs.forEach(log => {
    const date = new Date(log.date)
    const weekStart = getWeekStart(date)
    const weekKey = weekStart.toISOString().split('T')[0]
    
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
        delta = `${prefix}${change.toFixed(2)} kg`
      }
    }

    const weekStart = new Date(weekKey)
    
    stats.push({
      week: formatDateShort(weekStart),
      avgWeight: avgWeight ? `${avgWeight.toFixed(1)} kg` : '—',
      avgCalories: avgCalories ? Math.round(avgCalories) : '—',
      delta: delta,
      rawDelta: delta === '—' ? 0 : parseFloat(delta)
    })
  })

  return stats.reverse()
})

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function formatDateShort(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = date instanceof Date ? date : new Date(date)
  return `${months[d.getMonth()]} ${d.getDate()}`
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

const hasWeightData = computed(() => {
  return store.logs && store.logs.some(log => log.weight)
})
const weightChartData = computed(() => {
  if (!store.logs || store.logs.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  const sortedLogs = [...store.logs]
    .filter(log => log.weight)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (sortedLogs.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  const firstDate = new Date(sortedLogs[0].date)
  const lastLogDate = new Date(sortedLogs[sortedLogs.length - 1].date)
  
  let goalDate = new Date(lastLogDate)
  if (store.averageWeight && store.goalWeight && store.weeklyRate !== undefined) {
    const diff = Math.abs(store.goalWeight - store.averageWeight)
    const rate = Math.abs(store.weeklyRate)
    
    if (rate > 0) {
      const weeks = diff / rate
      const days = Math.round(weeks * 7)
      goalDate = new Date()
      goalDate.setDate(goalDate.getDate() + days)
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
  let currentDate = new Date(firstDate)
  
  while (currentDate <= endDate) {
    allDates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  const labels = allDates.map(date => {
    return `${date.getMonth() + 1}/${date.getDate()}`
  })
  const weights = allDates.map(date => {
    const log = sortedLogs.find(l => {
      const logDate = new Date(l.date)
      return logDate.toDateString() === date.toDateString()
    })
    return log ? log.weight : null
  })

  const goalLine = []
  if (store.startWeight && store.weeklyRate !== undefined) {
    allDates.forEach(date => {
      const daysDiff = (date - firstDate) / (1000 * 60 * 60 * 24)
      const weeksDiff = daysDiff / 7
      const expectedWeight = store.startWeight + (store.weeklyRate * weeksDiff)
      goalLine.push(expectedWeight)
    })
  }

  const trendLine = calculateTrendLineExtended(sortedLogs, allDates, firstDate, trendEndDate)

  const datasets = [
    {
      label: 'Weight',
      data: weights,
      borderColor: '#4dd0e1', // .bg-cyan-4
      backgroundColor: '#2b7d88',
      tension: 0.1,
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 6,
      spanGaps: false
    }
  ]



  if (trendLine.length > 0) {
    datasets.push({
      label: 'Trend Estimate',
      data: trendLine,
      borderColor: '#ba68c8', //.bg-purple-4
      borderDash: [5, 5],
      tension: 0,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0
    })
  }

  if (goalLine.length > 0) {
    datasets.push({
      label: 'Set Goal',
      data: goalLine,
      borderColor: '#ffd54f', //.bg-amber-4
      tension: 0,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0
    })
  }

  return {
    labels,
    datasets
  }
})

function calculateTrendLineExtended(logs, allDates, firstDate, trendEndDate) {
  if (logs.length < 2) return []

  const firstDateTime = firstDate.getTime()
  
  const points = logs.map(log => ({
    x: (new Date(log.date).getTime() - firstDateTime) / (1000 * 60 * 60 * 24),
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
    return slope * daysSinceStart + intercept
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
        text: 'Weight (kg)'
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
        text: 'Date'
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
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
