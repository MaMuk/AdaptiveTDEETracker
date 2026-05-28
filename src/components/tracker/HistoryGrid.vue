<template>
  <q-card
    flat
    bordered
    class="history-grid-card bg-white rounded-borders"
  >
    <q-card-section class="q-pa-none">
      <div class="history-grid-scroll">
        <table class="history-grid-table">
          <thead>
            <tr>
              <th>Week</th>
              <th>Stats</th>
              <th
                v-for="day in weekdays"
                :key="day"
              >
                {{ day }}
              </th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="(week, weekIndex) in weeks"
              :key="week.weekStart"
            >
              <tr>
                <td
                  class="week-col"
                  :class="weekBoundaryClass(weekIndex)"
                  rowspan="2"
                >
                  {{ formatWeekLabel(week.weekStart) }}
                </td>
                <td class="stats-col">
                  Weight
                </td>
                <td
                  v-for="day in weekdays"
                  :key="`${week.weekStart}-w-${day}`"
                  class="cell"
                  :class="{ 'cell-active-top': resolveCellDate(week, day) === selectedDate }"
                  @click="onCellClick(week, day)"
                >
                  <div
                    class="cell-main"
                  >
                    {{ week.days[day] ? formatWeightCell(week.days[day].weight) : '—' }}
                  </div>
                </td>
              </tr>
              <tr
                class="cal-row"
                :class="weekBoundaryClass(weekIndex)"
              >
                <td class="stats-col">
                  Cal.
                </td>
                <td
                  v-for="day in weekdays"
                  :key="`${week.weekStart}-c-${day}`"
                  class="cell"
                  :class="{ 'cell-active-bottom': resolveCellDate(week, day) === selectedDate }"
                  @click="onCellClick(week, day)"
                >
                  <div
                    class="cell-sub"
                  >
                    {{ week.days[day]?.calories ?? '—' }}
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  },
  selectedDate: {
    type: String,
    default: ''
  },
  formatDate: {
    type: Function,
    required: true
  },
  formatBodyWeight: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['select-date'])

function toMondayKey(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  const day = d.getUTCDay()
  const delta = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - delta)
  return d.toISOString().slice(0, 10)
}

function weekdayLabel(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  const day = d.getUTCDay()
  return weekdays[day === 0 ? 6 : day - 1]
}

function addDaysUtc(dateKey, days) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatWeekLabel(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  const day = d.getUTCDate()
  const year = String(d.getUTCFullYear()).slice(-2)
  return `${day}-${month}-${year}`
}

const weeks = computed(() => {
  const sorted = [...props.logs].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return []

  const map = new Map()
  for (const log of sorted) {
    const key = toMondayKey(log.date)
    if (!map.has(key)) {
      map.set(key, {
        weekStart: key,
        days: { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null, Sat: null, Sun: null }
      })
    }
    const day = weekdayLabel(log.date)
    map.get(key).days[day] = log
  }

  const firstWeekStart = toMondayKey(sorted[0].date)
  const lastLogWeekStart = toMondayKey(sorted[sorted.length - 1].date)
  const currentWeekStart = toMondayKey(new Date().toISOString().slice(0, 10))
  const nextWeekAfterLastLog = addDaysUtc(lastLogWeekStart, 7)
  const endWeekStart = currentWeekStart > nextWeekAfterLastLog ? currentWeekStart : nextWeekAfterLastLog

  const allWeeks = []
  let cursor = firstWeekStart
  while (cursor <= endWeekStart) {
    allWeeks.push(map.get(cursor) || {
      weekStart: cursor,
      days: { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null, Sat: null, Sun: null }
    })
    cursor = addDaysUtc(cursor, 7)
  }

  return allWeeks
})

function resolveCellDate(week, dayLabel) {
  const existing = week?.days?.[dayLabel]?.date
  if (existing) return existing
  const dayIndex = weekdays.indexOf(dayLabel)
  if (!week?.weekStart || dayIndex < 0) return null
  return addDaysUtc(week.weekStart, dayIndex)
}

function onCellClick(week, dayLabel) {
  const targetDate = resolveCellDate(week, dayLabel)
  if (!targetDate) return
  emit('select-date', targetDate)
}

function formatWeightCell(weightKg) {
  const formatted = String(props.formatBodyWeight(weightKg, 1) || '')
  return formatted.replace(/\s*(kg|lb)\s*$/i, '')
}

function weekBoundaryClass(weekIndex) {
  if ((weekIndex + 1) % 4 === 0) return 'week-border-strong'
  return 'week-border-mid'
}
</script>

<style scoped>
.history-grid-scroll {
  overflow-x: auto;
}

.history-grid-table {
  width: 100%;
  min-width: min(100%, 600px);
  border-collapse: collapse;
  border-spacing: 0;
  background: #eef1f7;
}

.history-grid-table th,
.history-grid-table td {
  padding: clamp(2px, 0.45vw, 4px) clamp(2px, 0.6vw, 5px);
  border-bottom: 1px solid #cfd7e8;
  border-right: 1px solid #cfd7e8;
  text-align: center;
  font-size: clamp(0.67rem, 1.7vw, 0.78rem);
  line-height: 1.15;
  background: #ffffff;
}

.history-grid-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #dde4f2;
  color: #2d4f96;
  font-weight: 700;
}

.history-grid-table thead th:first-child,
.history-grid-table tbody td:first-child {
  border-left: 1px solid #cfd7e8;
}

.week-col {
  width: clamp(74px, 13.5vw, 90px);
  min-width: clamp(74px, 13.5vw, 90px);
  text-align: center !important;
  vertical-align: middle;
  color: #2e4f96;
  background: #e6ebf6 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.stats-col {
  width: clamp(34px, 6vw, 44px);
  min-width: clamp(34px, 6vw, 44px);
  text-align: center !important;
  color: #3b5eab;
  background: #e9eef8 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.cell {
  cursor: pointer;
  transition: background-color 0.16s ease;
}

.cell:hover {
  background: #f2f6ff;
}

.cell-main {
  font-weight: 400;
  color: #3f517f;
  font-size: clamp(0.62rem, 1.5vw, 0.72rem);
}

.cell-sub {
  color: #3f517f;
  font-size: clamp(0.62rem, 1.5vw, 0.72rem);
  font-weight: 400;
}

.cell-active-top,
.cell-active-bottom {
  background: #fff7ce !important;
}

.cell-active-top {
  border-top: 2px solid #ffd500 !important;
  border-left: 2px solid #ffd500 !important;
  border-right: 2px solid #ffd500 !important;
}

.cell-active-bottom {
  border-bottom: 2px solid #ffd500 !important;
  border-left: 2px solid #ffd500 !important;
  border-right: 2px solid #ffd500 !important;
}

.cal-row.week-border-mid td {
  border-bottom-color: #b8c2d9;
}

.cal-row.week-border-strong td {
  border-bottom-color: #98a6c5;
}

.cal-row.week-border-mid .stats-col {
  border-bottom-color: #b8c2d9;
}

.cal-row.week-border-strong .stats-col {
  border-bottom-color: #98a6c5;
}

.cal-row.week-border-mid .stats-col,
.cal-row.week-border-strong .stats-col {
  border-bottom-width: 1px;
}

.week-col.week-border-mid {
  border-bottom-color: #b8c2d9;
}

.week-col.week-border-strong {
  border-bottom-color: #98a6c5;
}
</style>
