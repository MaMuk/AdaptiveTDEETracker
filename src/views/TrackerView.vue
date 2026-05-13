<template>
  <q-page padding>
    <q-card class="bg-accent text-primary q-mb-md">
      <q-card-section class="q-pb-sm">
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-card
              flat
              bordered
              class="bg-white"
            >
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7">
                  <span
                    class="cursor-pointer"
                    @click="showCurrentWeightInfo = !showCurrentWeightInfo"
                  >
                    Current Weight
                    <q-icon
                      name="info"
                      size="xs"
                      class="q-ml-xs"
                    />
                  </span>
                  <span
                    v-if="showCurrentWeightInfo"
                    class="text-grey-6 text-caption q-ml-xs"
                  >
                    {{ currentWeightInfoText }}
                  </span>
                </div>
                <div class="text-body1 text-weight-medium">
                  {{ store.averageWeight ? store.averageWeight.toFixed(1) : '—' }} kg
                </div>
                <div
                  class="text-caption"
                  :class="weightChangeClass"
                >
                  {{ weightChangeText }}
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6">
            <q-card
              flat
              bordered
              class="bg-white"
            >
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7">
                  Goal Weight
                </div>
                <div class="text-body1 text-weight-medium">
                  {{ store.goalWeight ? store.goalWeight.toFixed(1) : '—' }} kg
                </div>
                <div class="text-caption text-grey-7">
                  {{ goalDifference }}
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12">
            <q-card
              flat
              bordered
              class="bg-white"
            >
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7">
                  To reach your goal by {{ goalDateText }}
                </div>
                <div class="text-h6 text-weight-bold text-primary">
                  <span
                    class="cursor-pointer"
                    @click="showCalorieBreakdown = !showCalorieBreakdown"
                  >
                    {{ recommendedCalories }} kcal/day
                    <q-icon
                      name="info"
                      size="xs"
                      class="q-ml-xs"
                    />
                  </span>
                  <span
                    v-if="showCalorieBreakdown"
                    class="text-info text-subtitle2"
                  >{{ calorieBreakdownText }}</span>
                </div>
                <div class="text-caption text-grey-7">
                  {{ weeksToGoal }}
                </div>
                <div
                  v-if="tdeeConfidenceHint"
                  class="text-caption text-warning q-mt-xs"
                >
                  {{ tdeeConfidenceHint }}
                </div>
                <q-card
                  v-if="isDevModeEnabled"
                  flat
                  bordered
                  class="q-mt-sm bg-grey-1"
                >
                  <q-card-section class="q-pa-sm">
                    <div class="text-caption text-weight-medium">
                      DEV: Recommendation Calculation
                    </div>
                    <div class="text-caption">
                      Logged maintenance: {{ calculationDebug.loggedMaintenance }}
                    </div>
                    <div class="text-caption">
                      Activity maintenance: {{ calculationDebug.activityMaintenance }}
                    </div>
                    <div class="text-caption">
                      Assist blend: {{ calculationDebug.assistBlend }}
                    </div>
                    <div class="text-caption">
                      Daily adjustment: {{ calculationDebug.dailyAdjustment }}
                    </div>
                    <div class="text-caption">
                      Goal direction: {{ calculationDebug.goalDirection }}
                    </div>
                    <div class="text-caption">
                      Final recommendation: {{ calculationDebug.finalRecommendation }}
                    </div>
                  </q-card-section>
                </q-card>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12">
            <q-card
              flat
              bordered
              class="bg-white"
            >
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7">
                  Last 7 Days
                </div>
                <div class="row items-center justify-between">
                  <div class="col">
                    <div class="text-caption">
                      <span
                        class="cursor-pointer"
                        @click="showWeightChangeInfo = !showWeightChangeInfo"
                      >
                        Weight Change
                        <q-icon
                          name="info"
                          size="xs"
                          class="q-ml-xs"
                        />
                      </span>
                      <span
                        v-if="showWeightChangeInfo"
                        class="text-grey-6 text-caption q-ml-xs"
                      >
                        {{ weightChangeInfoText }}
                      </span>
                    </div>
                    <div
                      class="text-body2 text-weight-medium"
                      :class="sevenDayWeightClass"
                    >
                      {{ sevenDayWeightDelta }}
                    </div>
                  </div>
                  <div class="col">
                    <div class="text-caption">
                      Avg Calories
                    </div>
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

    <div class="date-carousel-container q-mb-md">
      <div class="date-navigation row items-center justify-between q-mb-sm">
        <q-btn
          flat
          round
          dense
          icon="chevron_left"
          aria-label="Previous day"
          @click="previousDay"
        />
        <div
          class="text-h6 cursor-pointer"
          @click="showDatePicker = true"
        >
          <time
            :datetime="selectedDate"
            :title="formatDate(selectedDate)"
          >
            <q-btn
              color="white"
              text-color="primary"
              outline
              label="Select Date"
              icon="calendar_month"
              @click="showDatePicker = true"
            />
          </time>
        </div>
        <q-btn
          flat
          round
          dense
          icon="chevron_right"
          aria-label="Next day"
          @click="nextDay"
        />
      </div>

      <div class="carousel-container">
        <transition
          :name="transitionName"
          mode="out-in"
        >
          <q-card
            :key="selectedDate"
            class="day-card elevation-4"
          >
            <q-inner-loading :showing="isLoading" />
            <q-card-section>
              <div class="text-subtitle1 text-center q-mb-sm">
                {{ formatDate(selectedDate) }}
              </div>
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

    <div
      v-if="store.foodDiaryEnabled"
      class="q-mb-md"
    >
      <transition
        :name="transitionName"
        mode="out-in"
      >
        <q-card :key="`summary-${selectedDate}`">
          <q-card-section>
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-h6">
                Diary Summary
              </div>
              <div class="row items-center q-gutter-sm summary-overall-bar">
                <CalorieBudgetBar
                  :consumed="dayDiaryCalories"
                  :target="totalDailyBudget"
                  :gain-mode="isGainMode"
                  max-width="220px"
                  size="18px"
                />
              </div>
              <div class="row items-center q-gutter-xs">
                <q-btn
                  dense
                  flat
                  :icon="isDiarySummaryCollapsed ? 'expand_more' : 'expand_less'"
                  :label="isDiarySummaryCollapsed ? 'Expand' : 'Collapse'"
                  @click="isDiarySummaryCollapsed = !isDiarySummaryCollapsed"
                />
                <q-btn
                  dense
                  flat
                  icon="open_in_new"
                  label="Open Diary"
                  @click="openDiaryForSection('')"
                />
              </div>
            </div>
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-caption">
                Date: {{ formatDate(selectedDate) }}
              </div>
            </div>

            <div v-if="!isDiarySummaryCollapsed">
              <div
                v-if="dayDiaryEntries.length === 0"
                class="text-grey-7 q-mb-sm"
              >
                No diary entries for this day yet.
              </div>
              <div
                v-for="group in diarySummaryGroups"
                :key="group.key"
                class="q-mb-sm"
              >
                <div class="row items-center justify-between q-mb-xs">
                  <div class="text-subtitle2">
                    {{ group.label }}
                  </div>
                </div>
                <CalorieBudgetBar
                  :consumed="group.calories"
                  :target="group.targetCalories"
                  :gain-mode="isGainMode"
                  max-width="320px"
                  size="16px"
                />
                <q-list
                  bordered
                  separator
                >
                  <q-item
                    v-for="entry in group.entries"
                    :key="entry.id"
                  >
                    <q-item-section>
                      <q-item-label>{{ entry.name }}</q-item-label>
                      <q-item-label caption>
                        {{ entry.amount || 'No amount' }} • {{ entry.calories }} kcal
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>

            <div class="row items-center justify-between q-mt-md">
              <div class="text-subtitle1">
                Diary Total: {{ dayDiaryCalories }} kcal
              </div>
              <q-btn
                color="primary"
                label="Mark Day Complete"
                :disable="dayDiaryEntries.length === 0"
                @click="commitDiaryToDailyLog"
              />
            </div>
          </q-card-section>
        </q-card>
      </transition>
    </div>

    <QDialog v-model="showDatePicker">
      <q-card-section>
        <QDate
          v-model="selectedDate"
          mask="YYYY-MM-DD"
          :events="hasLogsOnDate"
          event-color="positive"
          @update:model-value="onDateSelected"
        />
      </q-card-section>
    </QDialog>

    <QDialog v-model="showDeleteDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">
            Delete Entry
          </div>
        </q-card-section>
        <q-card-section>Are you sure you want to delete this entry?</q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
            color="primary"
          />
          <q-btn
            flat
            label="Delete"
            color="negative"
            @click="deleteEntry"
          />
        </q-card-actions>
      </q-card>
    </QDialog>

    <div class="text-h6 q-mb-sm">
      History
    </div>
    <q-list
      bordered
      separator
      class="bg-white rounded-borders"
    >
      <q-item
        v-for="log in displayedLogs"
        :key="log.date"
      >
        <q-item-section
          clickable
          @click="jumpToDate(log.date)"
        >
          <q-item-label>{{ formatDate(log.date) }}</q-item-label>
        </q-item-section>
        <q-item-section
          side
          clickable
          @click="jumpToDate(log.date)"
        >
          <div class="text-right">
            <div>{{ log.weight }} kg</div>
            <div class="text-caption">
              {{ log.calories }} kcal
            </div>
          </div>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            aria-label="Delete entry"
            @click.stop="confirmDelete(log.date)"
          />
        </q-item-section>
      </q-item>
      <q-item
        v-if="canLoadMore"
        clickable
        @click="loadMore"
      >
        <q-item-section class="text-center text-primary">
          <q-item-label>Load More</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { date as qDate, useQuasar } from 'quasar'
import { QDate, QDialog } from 'quasar'
import CalorieBudgetBar from '../components/CalorieBudgetBar.vue'
import { addDays, parseDateKey, todayKey } from '../utils/dateKey'
import { calculateDailyCalorieAdjustment, computeCalorieTarget } from '../utils/tdee'

const store = useUserStore()
const router = useRouter()
const $q = useQuasar()

const selectedDate = ref(todayKey())
const showDatePicker = ref(false)
const transitionName = ref('slide-left')
const isLoading = ref(false)
const showDeleteDialog = ref(false)
const dateToDelete = ref(null)
const showCalorieBreakdown = ref(false)
const showCurrentWeightInfo = ref(false)
const showWeightChangeInfo = ref(false)
const isDevModeEnabled = ref(false)

const currentWeight = ref(null)
const currentCalories = ref(null)
const historyLimit = ref(14)
const isDiarySummaryCollapsed = ref(true)

const previousDayDate = computed(() => {
  return addDays(selectedDate.value, -1)
})

const nextDayDate = computed(() => {
  return addDays(selectedDate.value, 1)
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
watch(selectedDate, () => loadDateData())
isDevModeEnabled.value = localStorage.getItem('tdee_dev_mode_enabled') === 'true'

const allLogs = computed(() => [...store.logs].sort((a, b) => b.date.localeCompare(a.date)))
const displayedLogs = computed(() => allLogs.value.slice(0, historyLimit.value))
const canLoadMore = computed(() => allLogs.value.length > historyLimit.value)

const dayDiaryEntries = computed(() => store.foodDiaryEntries
  .filter(entry => entry.date === selectedDate.value)
  .map(entry => ({
    ...entry,
    calories: Number(entry.calories) || 0
  }))
  .sort((a, b) => a.id.localeCompare(b.id)))

const diarySummaryGroups = computed(() => {
  const groups = []
  const unsectioned = dayDiaryEntries.value.filter(entry => !entry.section)
  if (unsectioned.length > 0) {
    const calories = unsectioned.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0)
    const targetCalories = sectionTargetCalories('')
    groups.push({
      key: 'unsectioned',
      label: 'Unsectioned',
      entries: unsectioned,
      calories,
      targetCalories
    })
  }

  for (const section of store.diarySections) {
    const entries = dayDiaryEntries.value.filter(entry => entry.section === section)
    if (entries.length > 0) {
      const calories = entries.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0)
      const targetCalories = sectionTargetCalories(section)
      groups.push({
        key: section,
        label: section,
        entries,
        calories,
        targetCalories
      })
    }
  }

  return groups
})

const dayDiaryCalories = computed(() => store.sumDiaryCaloriesByDate(selectedDate.value))
const isGainMode = computed(() => Number(store.weeklyRate) > 0)

const totalDailyBudget = computed(() => {
  const snapshot = store.diaryBudgetSnapshotsByDate?.[selectedDate.value]
  const isToday = selectedDate.value === todayKey()
  if (!isToday && snapshot && Number.isFinite(Number(snapshot.totalDailyBudget))) {
    return roundTo25(Number(snapshot.totalDailyBudget))
  }
  if (!Number.isFinite(Number(store.calculatedTDEE)) || !Number.isFinite(Number(store.weeklyRate))) return 0
  const rawBudget = computeCalorieTarget(Number(store.calculatedTDEE), Number(store.weeklyRate), {
    currentWeight: store.averageWeight,
    goalWeight: store.goalWeight
  })
  return roundTo25(rawBudget)
})
function sectionTargetCalories(section) {
  const key = section || '__unsectioned__'
  const snapshot = store.diaryBudgetSnapshotsByDate?.[selectedDate.value]
  const snapshotValue = Number(snapshot?.sectionPercentages?.[key])
  const percentage = Number.isFinite(snapshotValue) && snapshotValue >= 0
    ? snapshotValue
    : (Number(store.diarySectionPercentages?.[key]) || 0)
  return Math.max(0, Math.round((totalDailyBudget.value * percentage) / 100))
}

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
  if (store.weeklyRate < 0) return change <= 0 ? 'text-positive' : 'text-negative'
  if (store.weeklyRate > 0) return change >= 0 ? 'text-positive' : 'text-negative'
  return 'text-grey-7'
})

const goalDifference = computed(() => {
  if (!store.averageWeight || !store.goalWeight) return '—'
  const diff = Math.abs(store.goalWeight - store.averageWeight)
  if (store.weeklyRate === 0) return 'Maintain'
  const direction = store.goalWeight < store.averageWeight ? 'to lose' : 'to gain'
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
  if (!Number.isFinite(Number(store.calculatedTDEE)) || !Number.isFinite(Number(store.weeklyRate))) return '—'
  return totalDailyBudget.value
})

const calculationDebug = computed(() => {
  const details = store.tdeeDetails || {}
  const loggedMaintenance = Number(details.maintenanceFromLogs)
  const activityMaintenance = Number(details.activityBasedMaintenance)
  const assistBlendValue = Number(details.manualBias)
  const dailyAdjustment = calculateDailyCalorieAdjustment(store.weeklyRate)
  const currentWeightValue = Number(store.averageWeight)
  const goalWeightValue = Number(store.goalWeight)
  const goalDirection = Number.isFinite(currentWeightValue) && Number.isFinite(goalWeightValue)
    ? goalWeightValue === currentWeightValue
      ? 'maintain'
      : goalWeightValue > currentWeightValue
        ? 'gain'
        : 'lose'
    : 'unknown'

  return {
    loggedMaintenance: Number.isFinite(loggedMaintenance) ? `${Math.round(loggedMaintenance)} kcal` : '—',
    activityMaintenance: Number.isFinite(activityMaintenance) ? `${Math.round(activityMaintenance)} kcal` : '—',
    assistBlend: details.startupActivityEnabled
      ? `${Number.isFinite(assistBlendValue) ? assistBlendValue.toFixed(2) : '0.00'} (${details.startupActivityLevel || 'low'})`
      : 'disabled',
    dailyAdjustment: Number.isFinite(Number(dailyAdjustment)) ? `${Math.round(dailyAdjustment)} kcal` : '—',
    goalDirection,
    finalRecommendation: Number.isFinite(Number(recommendedCalories.value)) ? `${recommendedCalories.value} kcal` : '—'
  }
})

function toDate(value) {
  return parseDateKey(value)
}

function averageWeightFromLogs(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return null
  const sum = logs.reduce((acc, log) => acc + Number(log.weight), 0)
  return sum / logs.length
}

const sevenDayBaselineAverageWeight = computed(() => {
  const validLogs = [...store.logs]
    .filter(log => Number.isFinite(Number(log.weight)) && log.date)
    .sort((a, b) => toDate(b.date) - toDate(a.date))

  if (validLogs.length < 2) return null

  const latestDate = toDate(validLogs[0].date)
  const anchorDate = new Date(latestDate)
  anchorDate.setDate(anchorDate.getDate() - 7)

  const logsAtOrBeforeAnchor = validLogs.filter(log => toDate(log.date) <= anchorDate).slice(0, 7)
  if (logsAtOrBeforeAnchor.length > 0) {
    return averageWeightFromLogs(logsAtOrBeforeAnchor)
  }

  const fallbackLogs = [...validLogs]
    .reverse()
    .slice(0, Math.min(7, validLogs.length - 1))
  return averageWeightFromLogs(fallbackLogs)
})

const sevenDayWeightDelta = computed(() => {
  if (store.logs.length < 2 || !store.averageWeight || sevenDayBaselineAverageWeight.value === null) return '—'
  const latestWeight = store.averageWeight
  const baselineWeight = sevenDayBaselineAverageWeight.value
  if (latestWeight === null || latestWeight === undefined || baselineWeight === null || baselineWeight === undefined) return '—'
  const change = latestWeight - baselineWeight
  const prefix = change >= 0 ? '+' : ''
  return `${prefix}${change.toFixed(2)} kg`
})

const sevenDayWeightClass = computed(() => {
  if (store.logs.length < 2 || !store.averageWeight || sevenDayBaselineAverageWeight.value === null) return 'text-grey-7'
  const latestWeight = store.averageWeight
  const baselineWeight = sevenDayBaselineAverageWeight.value
  if (latestWeight === null || latestWeight === undefined || baselineWeight === null || baselineWeight === undefined || store.weeklyRate === undefined) return 'text-grey-7'
  const change = latestWeight - baselineWeight
  if (store.weeklyRate < 0) return change <= 0 ? 'text-positive' : 'text-negative'
  if (store.weeklyRate > 0) return change >= 0 ? 'text-positive' : 'text-negative'
  return 'text-grey-7'
})

const sevenDayAvgCalories = computed(() => {
  if (store.logs.length === 0) return 0
  const sortedLogs = [...store.logs].sort((a, b) => b.date.localeCompare(a.date))
  const recentLogs = sortedLogs.slice(0, 7).filter(log => log.calories)
  if (recentLogs.length === 0) return 0
  return recentLogs.reduce((acc, log) => acc + log.calories, 0) / recentLogs.length
})

const sevenDayAvgCaloriesRounded = computed(() => {
  const avg = sevenDayAvgCalories.value
  if (avg === 0) return '—'
  return `${roundTo25(avg)} kcal`
})

function normalizeDateKey(value) {
  return String(value || '').trim().replaceAll('/', '-')
}

const loggedDateSet = computed(() => new Set(
  (Array.isArray(store.logs) ? store.logs : [])
    .map(log => normalizeDateKey(log?.date))
    .filter(Boolean)
))

const calorieBreakdownText = computed(() => {
  if (!store.startWeight && !store.currentWeight) return '—'
  const tdee = roundTo25(store.calculatedTDEE)
  const difference = roundTo25(recommendedCalories.value - Number(store.calculatedTDEE))
  const sign = difference >= 0 ? '+' : '-'
  return ` (${tdee} kcal ${sign} ${Math.abs(difference)} kcal)`
})

const currentWeightInfoText = computed(() => {
  return ' Uses your smoothed average from recent weight logs.'
})

const weightChangeInfoText = computed(() => {
  return ' Computes weight delta from averaged recent logs, comparing the present window to the nearest valid window around seven days prior.'
})

const tdeeConfidenceHint = computed(() => {
  const validLogDates = [...store.logs]
    .filter(log => log && log.date)
    .map(log => parseDateKey(log.date))
    .filter(date => Number.isFinite(date?.getTime?.()))
    .sort((a, b) => a - b)

  const trackedDays = validLogDates.length > 1
    ? Math.floor((validLogDates[validLogDates.length - 1] - validLogDates[0]) / 86400000) + 1
    : validLogDates.length === 1
      ? 1
      : 0
  const hasAtLeastThreeWeeks = trackedDays >= 21
  const startupAssistEnabled = Boolean(store.startupActivityEnabled)

  if (!startupAssistEnabled && trackedDays > 0 && !hasAtLeastThreeWeeks) {
    return 'Startup activity assist is available in Settings to stabilize recommendations during the first 3 weeks of logs.'
  }
  if (startupAssistEnabled && !hasAtLeastThreeWeeks) {
    return 'Startup activity assist is currently active and blending your recommendation with your profile activity baseline.'
  }
  if (startupAssistEnabled && hasAtLeastThreeWeeks) {
    return 'Startup activity assist is active. You now have at least 3 weeks of log history, so you can disable it in Settings if you prefer log-only recommendations.'
  }

  const details = store.tdeeDetails
  if (!details) return ''
  if (details.confidence === 'baseline') {
    return 'Early logging period detected. TDEE is weighted toward your baseline until enough trend data is available.'
  }
  if (details.confidence === 'low') {
    return 'Adaptive trend is starting to contribute, but confidence is still low.'
  }
  return ''
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
  const current = parseDateKey(selectedDate.value)
  const target = parseDateKey(date)
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

function hasLogsOnDate(date) {
  return loggedDateSet.value.has(normalizeDateKey(date))
}

function saveLog() {
  store.addLog(selectedDate.value, currentWeight.value, currentCalories.value)
}

function openDiaryForSection(section) {
  router.push({ path: '/diary', query: { date: selectedDate.value, section: section || '' } })
}

function commitDiaryToDailyLog() {
  if (dayDiaryEntries.value.length === 0) return
  const totalCalories = dayDiaryCalories.value
  const existingLog = store.logs.find(log => log.date === selectedDate.value)
  const hasExistingCalories = existingLog && existingLog.calories !== null && existingLog.calories !== undefined

  const commit = () => {
    const weightToUse = existingLog ? existingLog.weight : currentWeight.value
    store.addLog(selectedDate.value, weightToUse, totalCalories)
    currentCalories.value = totalCalories
    $q.notify({ type: 'positive', message: `Saved ${totalCalories} kcal to daily log.` })
  }

  if (hasExistingCalories && existingLog.calories !== totalCalories) {
    $q.dialog({
      title: 'Overwrite Daily Calories?',
      message: `This day already has ${existingLog.calories} kcal in the daily log. Replace it with ${totalCalories} kcal from the diary?`,
      cancel: true,
      persistent: true,
      ok: { label: 'Overwrite', color: 'negative' }
    }).onOk(commit)
    return
  }

  commit()
}

function formatDate(dateString) {
  return qDate.formatDate(dateString, 'MMM D, YYYY')
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
  overflow-x: hidden;
  overflow-y: visible;
  padding-top: 4px;
  padding-bottom: 4px;
}

.day-card {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

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

.summary-overall-bar {
  width: 220px;
  min-width: 220px;
}
</style>
