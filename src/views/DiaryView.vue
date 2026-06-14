<template>
  <q-page
    padding
    class="diary-page"
  >
    <q-card class="q-mb-sm">
      <q-card-section class="row items-center justify-between q-py-sm">
        <div class="row items-center q-gutter-xs">
          <q-btn
            flat
            round
            dense
            icon="skip_previous"
            :disable="!previousPopulatedDate"
            aria-label="Previous populated day"
            @click="jumpToPreviousPopulatedDate"
          />
          <q-btn
            flat
            round
            dense
            icon="chevron_left"
            aria-label="Previous day"
            @click="previousDay"
          />
        </div>
        <div class="text-center">
          <div class="text-h6 q-mb-xs">
            Food Diary
          </div>
          <div class="text-caption q-mb-xs">
            {{ formatDate(selectedDate) }}
          </div>
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
        <div class="row items-center q-gutter-xs">
          <q-btn
            flat
            round
            dense
            icon="chevron_right"
            aria-label="Next day"
            @click="nextDay"
          />
          <q-btn
            flat
            round
            dense
            icon="skip_next"
            :disable="!nextPopulatedDate"
            aria-label="Next populated day"
            @click="jumpToNextPopulatedDate"
          />
        </div>
      </q-card-section>
      <q-card-actions
        data-tour="diary-actions"
        class="q-pt-none"
        align="between"
      >
        <q-btn
          flat
          icon="arrow_back"
          label="Back"
          @click="router.push('/')"
        />
      </q-card-actions>
      <q-card-section class="q-pt-none">
        <div class="text-caption q-mb-xs">
          Overall
        </div>
        <CalorieBudgetBar
          data-tour="diary-overall"
          :consumed="overallTrackedCalories"
          :target="totalDailyBudget"
          :gain-mode="isGainMode"
          max-width="360px"
          size="18px"
        />
      </q-card-section>
    </q-card>

    <q-card class="q-pa-sm">
      <div
        v-for="(section, idx) in allSections"
        :key="section.value"
        :data-tour="idx === 0 ? 'diary-section-first' : null"
        class="section-block"
      >
        <q-separator
          v-if="idx > 0"
          class="q-my-sm"
        />
        <div class="row items-center justify-between q-mb-sm">
          <div class="col q-pr-sm">
            <div class="text-subtitle1">
              {{ section.label }}
            </div>
            <CalorieBudgetBar
              :consumed="sectionTrackedCalories(section.value)"
              :target="sectionTargetCalories(section.value)"
              :gain-mode="isGainMode"
              max-width="320px"
              size="16px"
            />
          </div>
          <q-btn
            dense
            unelevated
            :color="isSectionClosed(section.value) ? 'grey-7' : 'primary'"
            :icon="isSectionClosed(section.value) ? 'lock' : 'lock_open'"
            :label="isSectionClosed(section.value) ? 'Closed' : 'Close'"
            @click="toggleSectionClosed(section.value)"
          />
        </div>

        <div
          v-for="row in entriesBySection(section.value)"
          :key="row.id"
          class="entry-row q-mb-xs"
        >
          <div class="row items-center no-wrap">
            <div class="col entry-main q-pr-sm">
              <div class="entry-name">
                {{ row.name }}
              </div>
              <div class="text-caption text-grey-7">
                {{ row.amount || 'No amount' }} · {{ row.calories }} kcal<span v-if="row.usePer100g"> · {{ row.caloriesPer100g || 0 }} kcal/100g</span>
              </div>
              <div
                v-if="store.diaryMacroTrackingEnabled"
                class="macro-inline-row"
              >
                <q-badge
                  class="macro-pill"
                  outline
                  color="red-6"
                >
                  P {{ formatMacroWithUnit(macroTotalFromEntry(row, 'protein')) }}
                </q-badge>
                <q-badge
                  class="macro-pill"
                  outline
                  color="amber-7"
                >
                  C {{ formatMacroWithUnit(macroTotalFromEntry(row, 'carbohydrates')) }}
                </q-badge>
                <q-badge
                  class="macro-pill"
                  outline
                  color="green-6"
                >
                  F {{ formatMacroWithUnit(macroTotalFromEntry(row, 'fat')) }}
                </q-badge>
              </div>
            </div>
            <div class="row items-center q-gutter-xs no-wrap">
              <q-btn
                dense
                flat
                round
                icon="drag_indicator"
                color="grey-7"
              >
                <q-menu auto-close>
                  <q-list
                    dense
                    style="min-width: 160px;"
                  >
                    <q-item
                      v-for="targetSection in allSections"
                      :key="`${row.id}_${targetSection.value || '__unsectioned__'}`"
                      clickable
                      :disable="isSectionClosed(targetSection.value)"
                      @click="quickMoveRow(row, targetSection.value || '__unsectioned__')"
                    >
                      <q-item-section>{{ targetSection.label }}</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
              <q-btn
                dense
                flat
                icon="edit"
                color="primary"
                @click="openEntryDialog({ section: row.section, row })"
              />
              <q-btn
                dense
                flat
                round
                icon="delete"
                color="negative"
                @click="confirmDeleteRow(row)"
              />
            </div>
          </div>
        </div>
        <div class="entry-row entry-action-row q-mt-xs">
          <div class="row items-center justify-between no-wrap">
            <div class="row no-wrap">
              <q-btn
                :data-tour="idx === 0 ? 'diary-add-entry' : null"
                class="btn-muted-green"
                unelevated
                dense
                icon="add"
                label="Add Entry"
                :disable="isSectionClosed(section.value)"
                @click="openEntryDialog({ section: section.value })"
              />
            </div>
            <div class="row no-wrap">
              <q-btn
                class="btn-muted-blue"
                :data-tour="idx === 0 ? 'diary-create-meal' : null"
                unelevated
                dense
                icon="restaurant"
                label="Create Meal"
                :disable="isSectionClosed(section.value)"
                @click="openCreateMealDialog(section.value)"
              />
            </div>
          </div>
        </div>
      </div>
    </q-card>

    <q-card
      v-if="store.diaryMacroTrackingEnabled"
      class="q-mt-sm q-mb-sm"
    >
      <q-card-section>
        <div class="text-subtitle2 q-mb-xs">
          Tracked Macro Distribution
        </div>
        <div class="row items-center q-col-gutter-md">
          <div class="col-auto">
            <div
              class="macro-pie-chart"
              :style="{ background: macroPieBackground }"
              role="img"
              :aria-label="macroPieAriaLabel"
            />
          </div>
          <div class="col">
            <div class="text-caption q-mb-xs">
              Total tracked: {{ formatMacroWithUnit(macroDistribution.totalTrackedGrams) }}
            </div>
            <div class="text-caption macro-legend-row">
              <span
                class="macro-legend-swatch macro-legend-protein"
                aria-hidden="true"
              />
              Protein: {{ formatMacroDistributionLine(macroDistribution.protein) }}
            </div>
            <div class="text-caption macro-legend-row">
              <span
                class="macro-legend-swatch macro-legend-carbohydrates"
                aria-hidden="true"
              />
              Carbohydrates: {{ formatMacroDistributionLine(macroDistribution.carbohydrates) }}
            </div>
            <div class="text-caption macro-legend-row">
              <span
                class="macro-legend-swatch macro-legend-fat"
                aria-hidden="true"
              />
              Fat: {{ formatMacroDistributionLine(macroDistribution.fat) }}
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card
      v-if="store.diaryMacroTrackingEnabled"
      class="q-mt-sm q-mb-sm"
    >
      <q-card-section>
        <div class="text-subtitle2 q-mb-xs">
          Macro Tracking Coverage
        </div>
        <div class="text-caption">
          Protein tracked: {{ macroCoverage.protein.tracked }} / {{ macroCoverage.protein.total }} (missing {{ macroCoverage.protein.missing }})
        </div>
        <div class="text-caption">
          Carbohydrates tracked: {{ macroCoverage.carbohydrates.tracked }} / {{ macroCoverage.carbohydrates.total }} (missing {{ macroCoverage.carbohydrates.missing }})
        </div>
        <div class="text-caption">
          Fat tracked: {{ macroCoverage.fat.tracked }} / {{ macroCoverage.fat.total }} (missing {{ macroCoverage.fat.missing }})
        </div>
      </q-card-section>
    </q-card>

    <EntryDialog
      ref="entryDialogRef"
      v-model="showEntryDialog"
      :entry="activeEntryRow"
      :default-section="entryDialogSection"
      :sections="allSections.map(s => ({ label: s.label, value: s.value }))"
      :suggestions="rankedSuggestions"
      :measurement-units="store.measurementUnits"
      :measurement-unit-multipliers="store.measurementUnitMultipliers"
      :show-macro-fields="store.diaryMacroTrackingEnabled"
      :ai-recognition-enabled="store.aiMealRecognitionEnabled"
      ai-recognition-label="Recognize Meal"
      @save="saveEntryFromDialog"
      @open-suggestion-picker="openSuggestionPicker($event, true)"
      @open-ai-recognition="openRecognitionFromDialog"
    />

    <QDialog v-model="showSuggestionPicker">
      <q-card style="min-width: 320px; width: 100%; max-width: 860px;">
        <q-card-section>
          <div class="text-h6">
            Suggestions
          </div>
          <div class="text-caption">
            Context section: {{ sectionLabel(suggestionTargetSection) }}
          </div>
        </q-card-section>
        <q-card-section class="row q-col-gutter-sm q-pt-none">
          <div class="col-12 col-md-4">
            <q-input
              v-model="suggestionSearch"
              dense
              filled
              clearable
              label="Search name, notes, tags"
            />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="suggestionTagFilter"
              dense
              filled
              clearable
              use-input
              input-debounce="0"
              label="Filter by tag"
              :options="allSuggestionTags"
            />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="suggestionCalculatedFilter"
              dense
              filled
              emit-value
              map-options
              label="Calculated"
              :options="suggestionCalculatedFilterOptions"
            />
          </div>
          <div class="col-12 col-md-2">
            <q-select
              v-model.number="suggestionPageSize"
              dense
              filled
              emit-value
              map-options
              label="Rows per page"
              :options="[{ label: '5', value: 5 }, { label: '10', value: 10 }, { label: '20', value: 20 }]"
            />
          </div>
        </q-card-section>
        <q-card-section>
          <q-markup-table
            flat
            bordered
          >
            <thead>
              <tr>
                <th class="text-left">
                  Name
                </th>
                <th class="text-left">
                  Amount
                </th>
                <th class="text-left">
                  kcal
                </th>
                <th class="text-left">
                  Tags
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="suggestion in pagedSuggestions"
                :key="suggestion.id"
              >
                <td>
                  <q-icon
                    v-if="suggestion.usePer100g"
                    name="calculate"
                    class="q-mr-xs"
                  />
                  {{ suggestion.name }}
                </td>
                <td>{{ suggestion.amount || '—' }}</td>
                <td>{{ suggestion.usePer100g ? suggestion.caloriesPer100g : suggestion.calories }}</td>
                <td>{{ (suggestion.tags || []).join(', ') || '—' }}</td>
                <td>
                  <q-btn
                    dense
                    flat
                    label="Use"
                    color="primary"
                    @click="loadSuggestion(suggestion)"
                  />
                </td>
              </tr>
              <tr v-if="pagedSuggestions.length === 0">
                <td
                  colspan="5"
                  class="text-grey-7"
                >
                  No suggestions found.
                </td>
              </tr>
            </tbody>
          </q-markup-table>
          <div class="row items-center justify-between q-mt-sm">
            <div class="text-caption text-grey-7">
              {{ rankedSuggestions.length }} results
            </div>
            <q-pagination
              v-model="suggestionPage"
              :max="suggestionMaxPage"
              :max-pages="6"
              direction-links
              boundary-links
            />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Close"
          />
        </q-card-actions>
      </q-card>
    </QDialog>

    <QDialog v-model="showDatePicker">
      <q-card-section>
        <QDate
          v-model="selectedDate"
          mask="YYYY-MM-DD"
          :events="hasDiaryEntriesOnDate"
          event-color="positive"
          @update:model-value="onDateSelected"
        />
      </q-card-section>
    </QDialog>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { date as qDate, useQuasar } from 'quasar'
import { QDialog, QDate } from 'quasar'
import { useUserStore } from '../stores/user'
import CalorieBudgetBar from '../components/CalorieBudgetBar.vue'
import EntryDialog from '../components/EntryDialog.vue'
import { addDays, todayKey } from '../utils/dateKey'
import { computeCalorieTarget } from '../utils/tdee'
import { hasTrackedMacroValueForEntry, macroTotalFromEntry, toNullableMacro } from '../utils/diaryMacros'

const store = useUserStore()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const selectedDate = ref(route.query.date || todayKey())
const showSuggestionPicker = ref(false)
const showDatePicker = ref(false)
const showEntryDialog = ref(false)
const suggestionTargetSection = ref('')
const suggestionSearch = ref('')
const suggestionPage = ref(1)
const suggestionPageSize = ref(10)
const suggestionTagFilter = ref('')
const suggestionCalculatedFilterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Calculated only', value: 'calculated' },
  { label: 'Not calculated only', value: 'not_calculated' }
]
const suggestionCalculatedFilter = ref('all')
const suggestionForEntryDialog = ref(false)
const entryDialogRef = ref(null)
const activeEntryRow = ref(null)
const entryDialogSection = ref('')
const pendingSectionCombine = ref(null)

const allSections = computed(() => ([
  { label: 'Unsectioned', value: '' },
  ...store.getDiarySectionsForDate(selectedDate.value).map(section => ({ label: section, value: section }))
]))

const dayEntries = computed(() => store.foodDiaryEntries
  .filter(entry => entry.date === selectedDate.value)
  .map(entry => ({
    ...entry,
    calories: Number(entry.calories) || 0
  }))
  .sort((a, b) => a.id.localeCompare(b.id)))
const populatedDiaryDates = computed(() => [...new Set(
  store.foodDiaryEntries
    .filter(entry => String(entry?.date || '').length > 0)
    .map(entry => String(entry.date))
)].sort((a, b) => a.localeCompare(b)))
const populatedDiaryDateSet = computed(() => new Set(populatedDiaryDates.value.map(normalizeDateKey)))
const previousPopulatedDate = computed(() => {
  const current = selectedDate.value
  let previous = null
  for (const date of populatedDiaryDates.value) {
    if (date < current) previous = date
    else break
  }
  return previous
})
const nextPopulatedDate = computed(() => populatedDiaryDates.value.find(date => date > selectedDate.value) || null)

function roundTo25(val) {
  if (val === null || val === undefined || isNaN(val)) return 0
  return Math.round(Number(val) / 25) * 25
}

const dailyBudget = computed(() => {
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

const totalDailyBudget = computed(() => dailyBudget.value)
const isGainMode = computed(() => Number(store.weeklyRate) > 0)
const sectionCalories = computed(() => {
  const map = {}
  for (const entry of dayEntries.value) {
    const key = entry.section || '__unsectioned__'
    map[key] = (map[key] || 0) + (Number(entry.calories) || 0)
  }
  return map
})
const overallTrackedCalories = computed(() => Object.values(sectionCalories.value).reduce((sum, calories) => sum + calories, 0))
const macroCoverage = computed(() => {
  const entries = dayEntries.value
  const total = entries.length
  const countTracked = (key) => entries.filter(item => hasTrackedMacroValueForEntry(item, key)).length
  const proteinTracked = countTracked('protein')
  const carbsTracked = countTracked('carbohydrates')
  const fatTracked = countTracked('fat')
  return {
    protein: { total, tracked: proteinTracked, missing: Math.max(0, total - proteinTracked) },
    carbohydrates: { total, tracked: carbsTracked, missing: Math.max(0, total - carbsTracked) },
    fat: { total, tracked: fatTracked, missing: Math.max(0, total - fatTracked) }
  }
})
const macroDistribution = computed(() => {
  const collect = (key) => {
    let sum = 0
    let tracked = 0
    for (const item of dayEntries.value) {
      const numeric = macroTotalFromEntry(item, key)
      if (!Number.isFinite(numeric) || numeric < 0) continue
      sum += numeric
      tracked += 1
    }
    return { grams: Math.round(sum * 10) / 10, tracked }
  }
  const protein = collect('protein')
  const carbohydrates = collect('carbohydrates')
  const fat = collect('fat')
  const totalTrackedGrams = protein.grams + carbohydrates.grams + fat.grams
  const toPercent = (value) => (totalTrackedGrams > 0 ? Math.round((value / totalTrackedGrams) * 100) : 0)
  return {
    totalTrackedGrams: Math.round(totalTrackedGrams * 10) / 10,
    protein: { ...protein, percent: toPercent(protein.grams) },
    carbohydrates: { ...carbohydrates, percent: toPercent(carbohydrates.grams) },
    fat: { ...fat, percent: toPercent(fat.grams) }
  }
})
const macroPieBackground = computed(() => {
  if (macroDistribution.value.totalTrackedGrams <= 0) return '#eceff1'
  const protein = macroDistribution.value.protein.percent
  const carbohydrates = macroDistribution.value.carbohydrates.percent
  const proteinEnd = protein
  const carbsEnd = protein + carbohydrates
  return `conic-gradient(#e53935 0 ${proteinEnd}%, #fbc02d ${proteinEnd}% ${carbsEnd}%, #43a047 ${carbsEnd}% 100%)`
})
const macroPieAriaLabel = computed(() => (
  `Macronutrient distribution: protein ${macroDistribution.value.protein.percent} percent, `
  + `carbohydrates ${macroDistribution.value.carbohydrates.percent} percent, `
  + `fat ${macroDistribution.value.fat.percent} percent`
))

const allSuggestionTags = computed(() => {
  const tags = new Set()
  for (const item of store.foodSuggestions) {
    for (const tag of (item.tags || [])) tags.add(String(tag))
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
})
const rankedSuggestions = computed(() => {
  const now = Date.now()
  const secKey = suggestionTargetSection.value || '__unsectioned__'
  const query = suggestionSearch.value.trim().toLowerCase()
  const tagFilter = suggestionTagFilter.value.trim().toLowerCase()

  const withScore = store.foodSuggestions
    .filter(item => {
      const name = String(item.name || '').toLowerCase()
      const amount = String(item.amount || '').toLowerCase()
      const notes = String(item.notes || '').toLowerCase()
      const tags = (item.tags || []).map(tag => String(tag || '').toLowerCase())
      const matchesQuery = !query || name.includes(query) || amount.includes(query) || notes.includes(query) || tags.some(tag => tag.includes(query))
      const matchesTag = !tagFilter || tags.includes(tagFilter)
      const isCalculated = Boolean(item.usePer100g)
      const matchesCalculated = suggestionCalculatedFilter.value === 'all'
        || (suggestionCalculatedFilter.value === 'calculated' && isCalculated)
        || (suggestionCalculatedFilter.value === 'not_calculated' && !isCalculated)
      return matchesQuery && matchesTag && matchesCalculated
    })
    .map(item => {
      const usage = item.usage || { count: 0, lastUsedAt: null }
      const secUsage = (item.sectionUsage && item.sectionUsage[secKey]) || { count: 0, lastUsedAt: null }
      const updatedAtTs = item.updatedAt ? new Date(item.updatedAt).getTime() : 0
      const lastUsedTs = usage.lastUsedAt ? new Date(usage.lastUsedAt).getTime() : 0
      const secLastUsedTs = secUsage.lastUsedAt ? new Date(secUsage.lastUsedAt).getTime() : 0
      const recencyDays = lastUsedTs ? Math.max(0, (now - lastUsedTs) / 86400000) : 9999
      const sectionRecencyDays = secLastUsedTs ? Math.max(0, (now - secLastUsedTs) / 86400000) : 9999
      const updatedDays = updatedAtTs ? Math.max(0, (now - updatedAtTs) / 86400000) : 9999
      const namePriority = query && String(item.name || '').toLowerCase().includes(query) ? 8 : 0

      const score =
        namePriority +
        (secUsage.count * 8) +
        (usage.count * 3) +
        (1 / (1 + sectionRecencyDays)) * 6 +
        (1 / (1 + recencyDays)) * 4 +
        (1 / (1 + updatedDays)) * 2

      return { item, score }
    })
    .sort((a, b) => b.score - a.score)

  return withScore.map(entry => entry.item)
})

const suggestionMaxPage = computed(() => Math.max(1, Math.ceil(rankedSuggestions.value.length / suggestionPageSize.value)))
const pagedSuggestions = computed(() => {
  const start = (suggestionPage.value - 1) * suggestionPageSize.value
  return rankedSuggestions.value.slice(start, start + suggestionPageSize.value)
})

watch([suggestionSearch, suggestionPageSize, suggestionTagFilter, suggestionCalculatedFilter, rankedSuggestions], () => {
  suggestionPage.value = 1
})

watch(showEntryDialog, (isOpen) => {
  if (isOpen) return
  pendingSectionCombine.value = null
})

watch(selectedDate, date => {
  router.replace({ path: '/diary', query: { date } })
  ensureBudgetSnapshot(date)
})

function sectionKey(section) {
  return section || '__unsectioned__'
}

function normalizeDateKey(value) {
  return String(value || '').trim().replaceAll('/', '-')
}

function hasDiaryEntriesOnDate(date) {
  return populatedDiaryDateSet.value.has(normalizeDateKey(date))
}

function sectionTargetCalories(section) {
  return effectiveSectionTargets.value[sectionKey(section)] || 0
}

function sectionPercentageForDate(section, date) {
  const key = sectionKey(section)
  const snapshot = store.diaryBudgetSnapshotsByDate?.[date]
  const snapshotValue = Number(snapshot?.sectionPercentages?.[key])
  if (Number.isFinite(snapshotValue) && snapshotValue >= 0) return snapshotValue
  return Number(store.diarySectionPercentages?.[key]) || 0
}

const effectiveSectionTargets = computed(() => {
  const baseTargets = {}
  let transferable = 0
  const openKeys = []

  for (const section of allSections.value) {
    const key = sectionKey(section.value)
    const percentage = sectionPercentageForDate(section.value, selectedDate.value)
    const baseTarget = Math.max(0, Math.round((totalDailyBudget.value * percentage) / 100))
    baseTargets[key] = baseTarget

    if (isSectionClosed(section.value)) {
      const consumed = sectionTrackedCalories(section.value)
      transferable += (baseTarget - consumed)
    } else {
      openKeys.push(key)
    }
  }

  const adjusted = { ...baseTargets }
  const openBaseSum = openKeys.reduce((sum, key) => sum + (baseTargets[key] || 0), 0)

  if (transferable !== 0 && openKeys.length > 0) {
    let distributed = 0
    for (let i = 0; i < openKeys.length; i += 1) {
      const key = openKeys[i]
      const isLast = i === openKeys.length - 1
      const ratio = openBaseSum > 0 ? ((baseTargets[key] || 0) / openBaseSum) : (1 / openKeys.length)
      const share = isLast
        ? (transferable - distributed)
        : Math.round(transferable * ratio)
      adjusted[key] = Math.max(0, (adjusted[key] || 0) + share)
      distributed += share
    }
  }

  for (const section of allSections.value) {
    if (!isSectionClosed(section.value)) continue
    const key = sectionKey(section.value)
    adjusted[key] = sectionTrackedCalories(section.value)
  }

  return adjusted
})

function sectionTrackedCalories(section) {
  return sectionCalories.value[sectionKey(section)] || 0
}

function entriesBySection(section) {
  return store.getDiaryEntriesByDateAndSection(selectedDate.value, section)
}

function quickMoveRow(row, toSectionValue) {
  const nextSection = toSectionValue === '__unsectioned__' ? '' : toSectionValue
  if (isSectionClosed(nextSection)) return
  store.updateDiaryEntry(row.id, { section: nextSection })
}

function isSectionClosed(section) {
  const key = sectionKey(section === '__unsectioned__' ? '' : section)
  const forDate = store.diaryClosedSectionsByDate?.[selectedDate.value]
  return Array.isArray(forDate) ? forDate.includes(key) : false
}

function toggleSectionClosed(section) {
  const key = sectionKey(section)
  store.toggleDiarySectionClosedForDate(selectedDate.value, key)
}

function ensureBudgetSnapshot(date) {
  const keyDate = String(date || '').trim()
  if (!keyDate) return
  if (store.diaryBudgetSnapshotsByDate?.[keyDate]) return
  if (!Number.isFinite(Number(store.calculatedTDEE)) || !Number.isFinite(Number(store.weeklyRate))) return
  const rawBudget = computeCalorieTarget(Number(store.calculatedTDEE), Number(store.weeklyRate), {
    currentWeight: store.averageWeight,
    goalWeight: store.goalWeight
  })
  const totalDailyBudgetValue = roundTo25(rawBudget)
  const sectionPercentages = {}
  for (const section of allSections.value) {
    const key = sectionKey(section.value)
    sectionPercentages[key] = Number(store.diarySectionPercentages?.[key]) || 0
  }
  store.upsertDiaryBudgetSnapshot(keyDate, {
    calculatedTDEE: Number(store.calculatedTDEE),
    weeklyRate: Number(store.weeklyRate),
    totalDailyBudget: totalDailyBudgetValue,
    sectionPercentages
  })
}

function openEntryDialog({ section, row = null }) {
  pendingSectionCombine.value = null
  activeEntryRow.value = row ? { ...row } : null
  entryDialogSection.value = section || ''
  showEntryDialog.value = true
}

function saveEntryFromDialog(payload) {
  const normalizedPayload = {
    name: String(payload.name || '').trim(),
    amount: String(payload.amount || '').trim(),
    calories: Number(payload.calories) || 0,
    section: payload.section || '',
    protein: toNullableMacro(payload.protein),
    carbohydrates: toNullableMacro(payload.carbohydrates),
    fat: toNullableMacro(payload.fat),
    densityMode: payload.densityMode === 'per100' ? 'per100' : 'none',
    densityBasis: payload.densityBasis === 'volume' ? 'volume' : 'mass',
    densityKcalPer100Canonical: Number.isFinite(Number(payload.densityKcalPer100Canonical))
      ? Number(payload.densityKcalPer100Canonical)
      : null,
    usePer100g: Boolean(payload.usePer100g),
    caloriesPer100g: payload.usePer100g ? Number(payload.caloriesPer100g) : null
  }

  if (!payload.id && pendingSectionCombine.value && pendingSectionCombine.value.date === selectedDate.value) {
    for (const entryId of pendingSectionCombine.value.entryIds) {
      store.deleteDiaryEntry(entryId)
    }
    pendingSectionCombine.value = null
  }

  if (payload.id) {
    store.updateDiaryEntry(payload.id, normalizedPayload, { syncSuggestion: true })
  } else {
    store.addDiaryEntry(selectedDate.value, normalizedPayload, { syncSuggestion: true })
  }
}

function sumSectionMacro(entries, key) {
  let total = 0
  let hasValue = false
  for (const entry of entries) {
    const numeric = Number(entry?.[key])
    if (!Number.isFinite(numeric) || numeric < 0) continue
    total += numeric
    hasValue = true
  }
  return hasValue ? Math.round(total * 10) / 10 : null
}

function openCreateMealDialog(section) {
  const sectionEntries = entriesBySection(section)
  if (sectionEntries.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'This section has no entries to combine.'
    })
    return
  }

  const combinedCalories = sectionEntries.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0)
  activeEntryRow.value = {
    name: '',
    amount: '1 serving',
    calories: Math.round(combinedCalories),
    section: section || '',
    protein: sumSectionMacro(sectionEntries, 'protein'),
    carbohydrates: sumSectionMacro(sectionEntries, 'carbohydrates'),
    fat: sumSectionMacro(sectionEntries, 'fat'),
    usePer100g: false,
    caloriesPer100g: null
  }
  entryDialogSection.value = section || ''
  pendingSectionCombine.value = {
    date: selectedDate.value,
    section: section || '',
    entryIds: sectionEntries.map(entry => entry.id)
  }
  showEntryDialog.value = true
}

function formatMacro(value) {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric.toFixed(1).replace(/\.0$/, '') : '—'
}

function formatMacroWithUnit(value) {
  const formatted = formatMacro(value)
  return formatted === '—' ? '—' : `${formatted}g`
}

function formatMacroDistributionLine(item) {
  if (!item || Number(item.tracked) <= 0) return 'Not set'
  return `${item.grams}g (${item.percent}%)`
}

function confirmDeleteRow(row) {
  $q.dialog({
    title: 'Delete Row',
    message: row.name ? `Delete "${row.name}"?` : 'Delete this row?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    store.deleteDiaryEntry(row.id)
  })
}

function openSuggestionPicker(section, forEntryDialog = false) {
  suggestionTargetSection.value = section || ''
  suggestionSearch.value = ''
  suggestionTagFilter.value = ''
  suggestionCalculatedFilter.value = 'all'
  suggestionPage.value = 1
  suggestionForEntryDialog.value = forEntryDialog
  showSuggestionPicker.value = true
}

function loadSuggestion(suggestion) {
  if (suggestionForEntryDialog.value && showEntryDialog.value) {
    entryDialogRef.value?.applySuggestion({
      ...suggestion,
      section: suggestionTargetSection.value || ''
    })
  } else {
    store.addDiaryEntry(selectedDate.value, {
      name: suggestion.name,
      amount: suggestion.amount || '',
      calories: Number(suggestion.calories),
      section: suggestionTargetSection.value,
      protein: toNullableMacro(suggestion.protein),
      carbohydrates: toNullableMacro(suggestion.carbohydrates),
      fat: toNullableMacro(suggestion.fat),
      usePer100g: Boolean(suggestion.usePer100g),
      caloriesPer100g: suggestion.caloriesPer100g
    })
  }

  store.trackSuggestionLoad(suggestion.id, suggestionTargetSection.value)
  showSuggestionPicker.value = false
}

function sectionLabel(section) {
  return allSections.value.find(item => item.value === section)?.label || 'Unsectioned'
}

function previousDay() {
  selectedDate.value = addDays(selectedDate.value, -1)
}

function nextDay() {
  selectedDate.value = addDays(selectedDate.value, 1)
}

function jumpToPreviousPopulatedDate() {
  if (!previousPopulatedDate.value) return
  selectedDate.value = previousPopulatedDate.value
}

function jumpToNextPopulatedDate() {
  if (!nextPopulatedDate.value) return
  selectedDate.value = nextPopulatedDate.value
}

function onDateSelected() {
  showDatePicker.value = false
}

function formatDate(dateString) {
  return qDate.formatDate(dateString, 'MMM D, YYYY')
}

function openRecognitionFromDialog(section) {
  router.push({
    path: '/diary/ai-recognition',
    query: {
      date: selectedDate.value,
      section: section || '',
      ...(route.query.tourMock === '1' ? { tourMock: '1' } : {})
    }
  })
}

ensureBudgetSnapshot(selectedDate.value)
</script>

<style scoped>
.section-block {
  padding: 2px 0;
}

.entry-row {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: #fff;
  padding: 6px 8px;
}

.entry-main {
  min-width: 0;
}

.entry-name {
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-action-row {
  border-style: dashed;
  background: rgba(250, 250, 250, 0.9);
}

.macro-inline-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
  margin-top: 2px;
}

.macro-pill {
  font-size: 10px;
  line-height: 1.2;
  padding: 2px 5px;
  white-space: nowrap;
}

.btn-muted-green {
  background: #7da882;
  color: #fff;
}

.btn-muted-blue {
  background: #6f8fac;
  color: #fff;
}

.macro-pie-chart {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #eceff1;
}

.macro-legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.macro-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  flex: 0 0 10px;
}

.macro-legend-protein {
  background: #e53935;
}

.macro-legend-carbohydrates {
  background: #fbc02d;
}

.macro-legend-fat {
  background: #43a047;
}

</style>
