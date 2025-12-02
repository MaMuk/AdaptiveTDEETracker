<template>
  <q-page padding>
    <!-- TDEE Card -->
    <q-card class="bg-accent text-primary q-mb-md">
      <q-card-section class="q-pb-sm">
        
        <!-- Information Grid -->
        <div class="row q-col-gutter-sm">
          <!-- Current Weight & Change -->
          <div class="col-6">
            <q-card flat bordered class="bg-white">
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7">Current Weight</div>
                <div class="text-body1 text-weight-medium">
                  {{ store.averageWeight ? store.averageWeight.toFixed(1) : '—' }} kg
                </div>
                <div class="text-caption" :class="weightChangeClass">
                  {{ weightChangeText }}
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Goal Weight -->
          <div class="col-6">
            <q-card flat bordered class="bg-white">
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7">Goal Weight</div>
                <div class="text-body1 text-weight-medium">
                  {{ store.goalWeight ? store.goalWeight.toFixed(1) : '—' }} kg
                </div>
                <div class="text-caption text-grey-7">
                  {{ goalDifference }}
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Recommended Calories -->
          <div class="col-12">
            <q-card flat bordered class="bg-white">
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7">To reach your goal by {{ goalDateText }}</div>
                <div class="text-h6 text-weight-bold text-primary">
                  <span @click="showCalorieBreakdown = !showCalorieBreakdown" class="cursor-pointer">
                    {{ roundTo25(recommendedCalories) }} kcal/day
                    <q-icon name="info" size="xs" class="q-ml-xs" />
                  </span>
                  <span v-if="showCalorieBreakdown" class="text-info text-subtitle2">{{ calorieBreakdownText }}</span>
                </div>
                <div class="text-caption text-grey-7">
                  {{ weeksToGoal }}
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- 7-Day Delta -->
          <div class="col-12">
            <q-card flat bordered class="bg-white">
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7">Last 7 Days</div>
                <div class="row items-center justify-between">
                  <div class="col">
                    <div class="text-caption">Weight Change</div>
                    <div class="text-body2 text-weight-medium" :class="sevenDayWeightClass">
                      {{ sevenDayWeightDelta }}
                    </div>
                  </div>
                  <div class="col">
                    <div class="text-caption">Avg Calories</div>
                    <div class="text-body2 text-weight-medium">
                      {{ sevenDayAvgCaloriesRounded }}
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Date Carousel -->
    <div class="date-carousel-container q-mb-md">
      <div class="date-navigation row items-center justify-between q-mb-sm">
        <q-btn 
          flat 
          round 
          dense 
          icon="chevron_left" 
          @click="previousDay"
          aria-label="Previous day"
        />
        <div class="text-h6 cursor-pointer" @click="showDatePicker = true">
          <time :datetime="selectedDate" :title="formatDate(selectedDate)"><q-btn color="white" text-color="primary" outline  label="Select Date" icon="calendar_month" @click="showDatePicker = true" /></time>
        </div>
        <q-btn 
          flat 
          round 
          dense 
          icon="chevron_right" 
          @click="nextDay"
          aria-label="Next day"
        />
      </div>

      <!-- Carousel -->
      <div class="carousel-container">
        <transition :name="transitionName" mode="out-in">
          <q-card :key="selectedDate" class="day-card elevation-4">
            <q-inner-loading :showing="isLoading" />
            <q-card-section>
              <div class="text-subtitle1 text-center q-mb-sm">{{ formatDate(selectedDate) }}</div>
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <q-input 
                    v-model.number="currentWeight" 
                    type="number" 
                    label="Weight (kg)" 
                    filled 
                    dense 
                    step="0.1"
                  />
                </div>
                <div class="col-6">
                  <q-input 
                    v-model.number="currentCalories" 
                    type="number" 
                    label="Calories" 
                    filled 
                    dense 
                    step="1"
                  />
                </div>
              </div>
              <q-btn 
                label="Save Entry" 
                color="primary" 
                class="full-width q-mt-sm" 
                @click="saveLog" 
              />
            </q-card-section>
          </q-card>
        </transition>
      </div>
    </div>

    <!-- Date Picker Dialog -->
    <QDialog v-model="showDatePicker">
      <q-card-section>
        <QDate 
          v-model="selectedDate" 
          mask="YYYY-MM-DD"
          @update:model-value="onDateSelected"
        />
      </q-card-section>
    </QDialog>

    <!-- Delete Confirmation Dialog -->
    <QDialog v-model="showDeleteDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">Delete Entry</div>
        </q-card-section>
        <q-card-section>
          Are you sure you want to delete this entry?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Delete" color="negative" @click="deleteEntry" />
        </q-card-actions>
      </q-card>
    </QDialog>

    <!-- Recent History -->
    <div class="text-h6 q-mb-sm">History</div>
    <q-list bordered separator class="bg-white rounded-borders">
      <q-item v-for="log in displayedLogs" :key="log.date">
        <q-item-section @click="jumpToDate(log.date)" clickable>
          <q-item-label>{{ formatDate(log.date) }}</q-item-label>
        </q-item-section>
        <q-item-section side @click="jumpToDate(log.date)" clickable>
          <div class="text-right">
            <div>{{ log.weight }} kg</div>
            <div class="text-caption">{{ log.calories }} kcal</div>
          </div>
        </q-item-section>
        <q-item-section side>
          <q-btn 
            flat 
            round 
            dense 
            icon="delete" 
            color="negative"
            @click.stop="confirmDelete(log.date)"
            aria-label="Delete entry"
          />
        </q-item-section>
      </q-item>
      <q-item v-if="canLoadMore" clickable @click="loadMore">
        <q-item-section class="text-center text-primary">
          <q-item-label>Load More</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

  </q-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { date as qDate } from 'quasar'
import { QDate, QDialog } from 'quasar'

const store = useUserStore()

const selectedDate = ref(new Date().toISOString().split('T')[0])
const showDatePicker = ref(false)
const transitionName = ref('slide-left')
const isLoading = ref(false)
const showDeleteDialog = ref(false)
const dateToDelete = ref(null)
const showCalorieBreakdown = ref(false)

const currentWeight = ref(null)
const currentCalories = ref(null)

const historyLimit = ref(14)

const previousDayDate = computed(() => {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
})

const nextDayDate = computed(() => {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
})

function loadDateData() {
  const existingLog = store.logs.find(l => l.date === selectedDate.value)
  if (existingLog) {
    currentWeight.value = existingLog.weight
    currentCalories.value = existingLog.calories
  } else {
    currentWeight.value = store.currentWeight
    currentCalories.value = null
  }
}

loadDateData()

watch(selectedDate, () => {
  loadDateData()
})

const allLogs = computed(() => {
  return [...store.logs].sort((a, b) => new Date(b.date) - new Date(a.date))
})

const displayedLogs = computed(() => {
  return allLogs.value.slice(0, historyLimit.value)
})

const canLoadMore = computed(() => {
  return allLogs.value.length > historyLimit.value
})

function roundTo25(val) {
  if (val === '—' || val === null || val === undefined || isNaN(val)) return '—'
  return Math.round(val / 25) * 25
}

const weightChangeText = computed(() => {
  if (!store.startWeight || !store.averageWeight) return '—'
  const change = store.averageWeight - store.startWeight
  const prefix = change >= 0 ? '+' : ''
  return `${prefix}${change.toFixed(1)} kg from start`
})

const weightChangeClass = computed(() => {
  if (!store.startWeight || !store.averageWeight) return 'text-grey-7'
  const change = store.averageWeight - store.startWeight
  
  if (store.weeklyRate === undefined) return 'text-grey-7'
  
  if (store.weeklyRate < 0) {
    return change <= 0 ? 'text-positive' : 'text-negative'
  } else if (store.weeklyRate > 0) {
    return change >= 0 ? 'text-positive' : 'text-negative'
  } else {
    return 'text-grey-7'
  }
})

const goalDifference = computed(() => {
  if (!store.averageWeight || !store.goalWeight) return '—'
  const diff = Math.abs(store.goalWeight - store.averageWeight)
  
  if (store.weeklyRate === 0) return 'Maintain'
  
  const direction = store.goalWeight < store.currentWeight ? 'to lose' : 'to gain'
  return `${diff.toFixed(1)} kg ${direction}`
})

const weeksToGoal = computed(() => {
  if (!store.averageWeight || !store.goalWeight || store.weeklyRate === undefined) return '—'
  const diff = Math.abs(store.goalWeight - store.averageWeight)
  const rate = Math.abs(store.weeklyRate)
  if (rate === 0) return 'Maintain Goal'
  
  const weeks = diff / rate
  if (weeks < 1) return 'Less than 1 week'
  return `${weeks.toFixed(1)} weeks to reach your goal`
})

const goalDateText = computed(() => {
  if (!store.averageWeight || !store.goalWeight || store.weeklyRate === undefined) return '—'
  const diff = Math.abs(store.goalWeight - store.averageWeight)
  const rate = Math.abs(store.weeklyRate)
  
  if (rate === 0) return '—'
  
  const weeks = diff / rate
  const days = Math.round(weeks * 7)
  const goalDate = new Date()
  goalDate.setDate(goalDate.getDate() + days)
  return qDate.formatDate(goalDate, 'MMM D, YYYY')
})

const recommendedCalories = computed(() => {
  if (!store.calculatedTDEE || store.weeklyRate === undefined) return '—'
  
  const dailyAdjustment = (store.weeklyRate * 7700) / 7
  const targetCalories = store.calculatedTDEE + dailyAdjustment
  
  return Math.round(targetCalories)
})

const sevenDayWeightDelta = computed(() => {
  if (store.logs.length < 2) return '—'
  
  const sortedLogs = [...store.logs].sort((a, b) => new Date(b.date) - new Date(a.date))
  const recentLogs = sortedLogs.slice(0, 7)
  
  if (recentLogs.length < 2) return '—'
  
  const latestWeight = recentLogs[0].weight
  const oldestWeight = recentLogs[recentLogs.length - 1].weight
  
  if (!latestWeight || !oldestWeight) return '—'
  
  const change = latestWeight - oldestWeight
  const prefix = change >= 0 ? '+' : ''
  return `${prefix}${change.toFixed(2)} kg`
})

const sevenDayWeightClass = computed(() => {
  if (store.logs.length < 2) return 'text-grey-7'
  
  const sortedLogs = [...store.logs].sort((a, b) => new Date(b.date) - new Date(a.date))
  const recentLogs = sortedLogs.slice(0, 7)
  
  if (recentLogs.length < 2) return 'text-grey-7'
  
  const latestWeight = recentLogs[0].weight
  const oldestWeight = recentLogs[recentLogs.length - 1].weight
  
  if (!latestWeight || !oldestWeight || store.weeklyRate === undefined) return 'text-grey-7'
  
  const change = latestWeight - oldestWeight
  
  if (store.weeklyRate < 0) {
    return change <= 0 ? 'text-positive' : 'text-negative'
  } else if (store.weeklyRate > 0) {
    return change >= 0 ? 'text-positive' : 'text-negative'
  } else {
    return 'text-grey-7'
  }
})

const sevenDayAvgCalories = computed(() => {
  if (store.logs.length === 0) return 0
  
  const sortedLogs = [...store.logs].sort((a, b) => new Date(b.date) - new Date(a.date))
  const recentLogs = sortedLogs.slice(0, 7).filter(log => log.calories)
  
  if (recentLogs.length === 0) return 0
  
  const sum = recentLogs.reduce((acc, log) => acc + log.calories, 0)
  return sum / recentLogs.length
})

const sevenDayAvgCaloriesRounded = computed(() => {
  const avg = sevenDayAvgCalories.value
  if (avg === 0) return '—'
  return `${roundTo25(avg)} kcal`
})

const calorieBreakdownText = computed(() => {
  if (!store.startWeight && !store.currentWeight) return '—'
  
  const tdee = roundTo25(store.calculatedTDEE)
  const difference = roundTo25(recommendedCalories.value - store.calculatedTDEE)
  const sign = difference >= 0 ? '+' : '-'
  const absoluteDifference = Math.abs(difference)
  
  return ` (${tdee} kcal ${sign} ${absoluteDifference} kcal)`
})


function loadMore() {
  historyLimit.value += 7
}

function previousDay() {
  transitionName.value = 'slide-right'
  isLoading.value = true
  setTimeout(() => {
    selectedDate.value = previousDayDate.value
    isLoading.value = false
  }, 150)
}

function nextDay() {
  transitionName.value = 'slide-left'
  isLoading.value = true
  setTimeout(() => {
    selectedDate.value = nextDayDate.value
    isLoading.value = false
  }, 150)
}

function jumpToDate(date) {
  const current = new Date(selectedDate.value)
  const target = new Date(date)
  transitionName.value = target > current ? 'slide-left' : 'slide-right'
  isLoading.value = true
  setTimeout(() => {
    selectedDate.value = date
    isLoading.value = false
  }, 150)
}

function onDateSelected() {
  showDatePicker.value = false
}

function saveLog() {
  store.addLog(selectedDate.value, currentWeight.value, currentCalories.value)
}

function formatDate(dateString) {
  return qDate.formatDate(dateString, 'MMM D, YYYY')
}

function formatDateShort(dateString) {
  return qDate.formatDate(dateString, 'MMM D')
}

function confirmDelete(date) {
  dateToDelete.value = date
  showDeleteDialog.value = true
}

function deleteEntry() {
  if (dateToDelete.value) {
    store.deleteLog(dateToDelete.value)
    dateToDelete.value = null
  }
  showDeleteDialog.value = false
}
</script>

<style scoped>
.date-carousel-container {
  position: relative;
}

.carousel-container {
  width: 100%;
  position: relative;
  overflow: hidden;
}

.day-card {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

/* Slide animations */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s ease-out;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
