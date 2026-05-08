<template>
  <q-page padding class="diary-page">
    <q-card class="q-mb-sm">
      <q-card-section class="row items-center justify-between q-py-sm">
        <q-btn flat round dense icon="chevron_left" @click="previousDay" aria-label="Previous day" />
        <div class="text-center">
          <div class="text-h6">Food Diary</div>
          <div class="text-caption cursor-pointer" @click="showDatePicker = true">{{ formatDate(selectedDate) }}</div>
        </div>
        <q-btn flat round dense icon="chevron_right" @click="nextDay" aria-label="Next day" />
      </q-card-section>
      <q-card-actions class="q-pt-none" align="between">
        <q-btn flat icon="arrow_back" label="Back" @click="router.push('/')" />
        <q-btn
          v-if="store.aiMealRecognitionEnabled"
          class="ai-magic-btn"
          unelevated
          icon="auto_awesome"
          label="Recognize Meal"
          @click="openRecognition"
        />
      </q-card-actions>
      <q-card-section class="q-pt-none">
        <div class="text-caption q-mb-xs">Overall</div>
        <CalorieBudgetBar :consumed="overallTrackedCalories" :target="totalDailyBudget" max-width="360px" size="18px" />
      </q-card-section>
    </q-card>

    <q-card class="q-pa-sm">
      <div v-for="(section, idx) in allSections" :key="section.value" class="section-block">
        <q-separator v-if="idx > 0" class="q-my-sm" />
        <div class="row items-center justify-between q-mb-sm">
          <div class="col q-pr-sm">
            <div class="text-subtitle1">{{ section.label }}</div>
            <CalorieBudgetBar
              :consumed="sectionTrackedCalories(section.value)"
              :target="sectionTargetCalories(section.value)"
              max-width="320px"
              size="16px"
            />
          </div>
        </div>

        <div v-for="row in entriesBySection(section.value)" :key="row.id" class="entry-row q-mb-xs">
          <div class="row items-center no-wrap">
            <div class="col entry-main q-pr-sm">
              <div class="entry-name">{{ row.name }}</div>
              <div class="text-caption text-grey-7">
                {{ row.amount || 'No amount' }} · {{ row.calories }} kcal<span v-if="row.usePer100g"> · {{ row.caloriesPer100g || 0 }} kcal/100g</span>
              </div>
            </div>
            <div class="row items-center q-gutter-xs no-wrap">
              <q-btn dense flat round icon="drag_indicator" color="grey-7">
                <q-menu auto-close>
                  <q-list dense style="min-width: 160px;">
                    <q-item
                      v-for="targetSection in allSections"
                      :key="`${row.id}_${targetSection.value || '__unsectioned__'}`"
                      clickable
                      @click="quickMoveRow(row, targetSection.value || '__unsectioned__')"
                    >
                      <q-item-section>{{ targetSection.label }}</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
              <q-btn dense flat icon="edit" color="primary" @click="openEntryDialog({ section: row.section, row })" />
              <q-btn dense flat round icon="delete" color="negative" @click="confirmDeleteRow(row)" />
            </div>
          </div>
        </div>
        <div class="entry-row entry-action-row q-mt-xs">
          <div class="row items-center justify-between no-wrap">
            <div class="row no-wrap">
              <q-btn class="btn-muted-green" unelevated dense icon="add" label="Add Entry" @click="openEntryDialog({ section: section.value })" />
            </div>
            <div class="row no-wrap">
              <q-btn class="btn-muted-blue" unelevated dense icon="history" label="Add from History" @click="openSuggestionPicker(section.value)" />
            </div>
          </div>
        </div>
      </div>
    </q-card>

    <QDialog v-model="showEntryDialog" persistent>
      <q-card style="min-width: 320px; width: 100%; max-width: 760px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">{{ editDraft.id ? 'Edit Entry' : 'New Entry' }}</div>
          <q-chip dense :color="isDraftDirty ? 'orange-6' : 'positive'" text-color="white" icon="save">{{ isDraftDirty ? 'Unsaved' : 'Saved' }}</q-chip>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-8">
              <div class="name-field-wrap">
                <q-input
                  v-model="editDraft.name"
                  dense
                  filled
                  label="Name"
                  @update:model-value="onNameInputChanged"
                  @focus="showNameSuggestions = true"
                  @blur="onNameFieldBlur"
                />
                <q-list v-if="showNameSuggestions && nameSuggestionMatches.length > 0" bordered separator class="name-suggestion-list">
                  <q-item v-for="option in nameSuggestionMatches" :key="option.id" clickable @mousedown.prevent @click="chooseNameSuggestion(option)">
                    <q-item-section>
                      <q-item-label>{{ option.name }}</q-item-label>
                      <q-item-label caption>{{ option.amount || 'No amount' }} · {{ option.calories }} kcal</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <q-select
                v-model="editDraft.section"
                dense
                filled
                emit-value
                map-options
                label="Section"
                :options="allSections.map(s => ({ label: s.label, value: s.value }))"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="editDraft.amount" dense filled label="Amount" />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model.number="editDraft.calories"
                dense
                filled
                type="number"
                min="0"
                step="1"
                label="kcal"
                :disable="editDraft.usePer100g"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model.number="editDraft.caloriesPer100g"
                dense
                filled
                type="number"
                min="0"
                step="1"
                label="kcal / 100g"
                :disable="!editDraft.usePer100g"
              />
            </div>
            <div class="col-12">
              <q-checkbox v-model="editDraft.usePer100g" label="Use 100g mode" />
              <q-btn dense flat color="dark" icon="history" label="Open Suggestion Picker" @click="openSuggestionPicker(editDraft.section, true)" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Revert" :disable="!isDraftDirty" @click="revertDraft" />
          <q-btn flat label="Cancel" @click="closeEntryDialog" />
          <q-btn color="primary" unelevated label="Save" @click="saveDraft(true)" />
        </q-card-actions>
      </q-card>
    </QDialog>

    <QDialog v-model="showSuggestionPicker">
      <q-card style="min-width: 320px; width: 100%; max-width: 860px;">
        <q-card-section>
          <div class="text-h6">Suggestions</div>
          <div class="text-caption">Context section: {{ sectionLabel(suggestionTargetSection) }}</div>
        </q-card-section>
        <q-card-section class="row q-col-gutter-sm q-pt-none">
          <div class="col-12 col-md-5">
            <q-input v-model="suggestionSearch" dense filled clearable label="Search name, notes, tags" />
          </div>
          <div class="col-12 col-md-4">
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
          <q-markup-table flat bordered>
            <thead>
              <tr>
                <th class="text-left">Name</th>
                <th class="text-left">Amount</th>
                <th class="text-left">kcal</th>
                <th class="text-left">Tags</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="suggestion in pagedSuggestions" :key="suggestion.id">
                <td>{{ suggestion.name }}</td>
                <td>{{ suggestion.amount || '—' }}</td>
                <td>{{ suggestion.calories }}</td>
                <td>{{ (suggestion.tags || []).join(', ') || '—' }}</td>
                <td>
                  <q-btn dense flat label="Use" color="primary" @click="loadSuggestion(suggestion)" />
                </td>
              </tr>
              <tr v-if="pagedSuggestions.length === 0">
                <td colspan="5" class="text-grey-7">No suggestions found.</td>
              </tr>
            </tbody>
          </q-markup-table>
          <div class="row items-center justify-between q-mt-sm">
            <div class="text-caption text-grey-7">{{ rankedSuggestions.length }} results</div>
            <q-pagination v-model="suggestionPage" :max="suggestionMaxPage" :max-pages="6" direction-links boundary-links />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </QDialog>

    <QDialog v-model="showDatePicker">
      <q-card-section>
        <QDate v-model="selectedDate" mask="YYYY-MM-DD" @update:model-value="onDateSelected" />
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

const store = useUserStore()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const selectedDate = ref(route.query.date || new Date().toISOString().split('T')[0])
const showSuggestionPicker = ref(false)
const showDatePicker = ref(false)
const showEntryDialog = ref(false)
const suggestionTargetSection = ref('')
const suggestionSearch = ref('')
const suggestionPage = ref(1)
const suggestionPageSize = ref(10)
const suggestionTagFilter = ref('')
const suggestionForEntryDialog = ref(false)
const showNameSuggestions = ref(false)
const isDraftDirty = ref(false)
const lastSavedDraft = ref(defaultDraft())

const editDraft = ref(defaultDraft())

function defaultDraft() {
  return {
    id: null,
    name: '',
    amount: '',
    calories: null,
    section: '',
    usePer100g: false,
    caloriesPer100g: null
  }
}

const allSections = computed(() => ([
  { label: 'Unsectioned', value: '' },
  ...store.diarySections.map(section => ({ label: section, value: section }))
]))

const dayEntries = computed(() => store.foodDiaryEntries
  .filter(entry => entry.date === selectedDate.value)
  .map(entry => ({
    ...entry,
    calories: Number(entry.calories) || 0
  }))
  .sort((a, b) => a.id.localeCompare(b.id)))

const dailyBudget = computed(() => {
  if (!Number.isFinite(Number(store.calculatedTDEE)) || !Number.isFinite(Number(store.weeklyRate))) return 0
  const adjustment = (Number(store.weeklyRate) * 7700) / 7
  return Math.max(0, Math.round(Number(store.calculatedTDEE) + adjustment))
})

const totalDailyBudget = computed(() => dailyBudget.value)
const sectionCalories = computed(() => {
  const map = {}
  for (const entry of dayEntries.value) {
    const key = entry.section || '__unsectioned__'
    map[key] = (map[key] || 0) + (Number(entry.calories) || 0)
  }
  return map
})
const overallTrackedCalories = computed(() => Object.values(sectionCalories.value).reduce((sum, calories) => sum + calories, 0))

const allSuggestionTags = computed(() => {
  const tags = new Set()
  for (const item of store.foodSuggestions) {
    for (const tag of (item.tags || [])) tags.add(String(tag))
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
})
const nameSuggestionMatches = computed(() => {
  const query = String(editDraft.value.name || '').trim().toLowerCase()
  return rankedSuggestions.value
    .filter(item => String(item.name || '').trim().length > 0)
    .filter(item => !query || String(item.name || '').toLowerCase().includes(query))
    .filter((item, index, arr) => arr.findIndex(other => String(other.name || '').toLowerCase() === String(item.name || '').toLowerCase()) === index)
    .slice(0, 8)
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
      return matchesQuery && matchesTag
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

watch([suggestionSearch, suggestionPageSize, suggestionTagFilter, rankedSuggestions], () => {
  suggestionPage.value = 1
})

watch(selectedDate, date => {
  router.replace({ path: '/diary', query: { date } })
})

watch(editDraft, () => {
  if (showEntryDialog.value) {
    isDraftDirty.value = true
  }
}, { deep: true })

watch(
  () => [editDraft.value.usePer100g, editDraft.value.amount, editDraft.value.caloriesPer100g],
  () => {
    if (!showEntryDialog.value || !editDraft.value.usePer100g) return
    editDraft.value.calories = calculateCaloriesForDraft()
  }
)

function sectionKey(section) {
  return section || '__unsectioned__'
}

function sectionTargetCalories(section) {
  const key = sectionKey(section)
  const percentage = Number(store.diarySectionPercentages?.[key]) || 0
  return Math.max(0, Math.round((totalDailyBudget.value * percentage) / 100))
}

function sectionTrackedCalories(section) {
  return sectionCalories.value[sectionKey(section)] || 0
}

function entriesBySection(section) {
  return store.getDiaryEntriesByDateAndSection(selectedDate.value, section)
}

function quickMoveRow(row, toSectionValue) {
  const nextSection = toSectionValue === '__unsectioned__' ? '' : toSectionValue
  store.updateDiaryEntry(row.id, { section: nextSection })
}

function calculateCaloriesForDraft() {
  if (!editDraft.value.usePer100g) return Number(editDraft.value.calories) || 0
  const grams = Number(editDraft.value.amount)
  const per100g = Number(editDraft.value.caloriesPer100g)
  if (!Number.isFinite(grams) || grams < 0 || !Number.isFinite(per100g) || per100g < 0) {
    return Number(editDraft.value.calories) || 0
  }
  return Math.round((grams * per100g) / 100)
}

function validateDraft(notify = true) {
  const name = String(editDraft.value.name || '').trim()
  const calories = Number(calculateCaloriesForDraft())
  const caloriesPer100g = Number(editDraft.value.caloriesPer100g)

  if (!name) {
    if (notify) $q.notify({ type: 'negative', message: 'Name is required.' })
    return false
  }
  if (!Number.isFinite(calories) || calories < 0) {
    if (notify) $q.notify({ type: 'negative', message: 'Calories must be a valid non-negative number.' })
    return false
  }
  if (editDraft.value.usePer100g && (!Number.isFinite(caloriesPer100g) || caloriesPer100g < 0)) {
    if (notify) $q.notify({ type: 'negative', message: 'Calories per 100g must be valid when 100g mode is enabled.' })
    return false
  }
  return true
}

function saveDraft(closeAfterSave = false, silent = false) {
  if (!validateDraft(!silent)) return
  const payload = {
    name: String(editDraft.value.name || '').trim(),
    amount: String(editDraft.value.amount || '').trim(),
    calories: Math.round(calculateCaloriesForDraft()),
    section: editDraft.value.section || '',
    usePer100g: Boolean(editDraft.value.usePer100g),
    caloriesPer100g: editDraft.value.usePer100g ? Number(editDraft.value.caloriesPer100g) : null
  }

  if (editDraft.value.id) {
    store.updateDiaryEntry(editDraft.value.id, payload, { syncSuggestion: true })
  } else {
    store.addDiaryEntry(selectedDate.value, payload, { syncSuggestion: true })
    const created = store.getDiaryEntriesByDateAndSection(selectedDate.value, payload.section).slice(-1)[0]
    editDraft.value.id = created?.id || null
  }

  lastSavedDraft.value = {
    ...editDraft.value,
    ...payload
  }
  isDraftDirty.value = false
  if (closeAfterSave) {
    showEntryDialog.value = false
  }
}

function openEntryDialog({ section, row = null }) {
  if (row) {
    editDraft.value = {
      id: row.id,
      name: row.name || '',
      amount: row.amount || '',
      calories: Number(row.calories) || 0,
      section: row.section || section || '',
      usePer100g: Boolean(row.usePer100g),
      caloriesPer100g: row.caloriesPer100g ?? null
    }
  } else {
    editDraft.value = {
      ...defaultDraft(),
      section: section || ''
    }
  }
  lastSavedDraft.value = { ...editDraft.value }
  showNameSuggestions.value = false
  isDraftDirty.value = false
  showEntryDialog.value = true
}

function closeEntryDialog() {
  showEntryDialog.value = false
  editDraft.value = defaultDraft()
  showNameSuggestions.value = false
  lastSavedDraft.value = defaultDraft()
  isDraftDirty.value = false
}

function revertDraft() {
  if (!lastSavedDraft.value.id && editDraft.value.id) {
    store.deleteDiaryEntry(editDraft.value.id)
  }
  editDraft.value = { ...lastSavedDraft.value }
  isDraftDirty.value = false
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

function onNameFieldBlur() {
  editDraft.value.name = String(editDraft.value.name || '').trim()
  setTimeout(() => {
    showNameSuggestions.value = false
  }, 120)
}

function onNameInputChanged() {
  showNameSuggestions.value = true
}

function chooseNameSuggestion(suggestion) {
  editDraft.value = {
    ...editDraft.value,
    name: String(suggestion.name || '').trim(),
    amount: suggestion.amount || '',
    calories: Number(suggestion.calories) || 0,
    usePer100g: Boolean(suggestion.usePer100g),
    caloriesPer100g: suggestion.caloriesPer100g ?? null
  }
  showNameSuggestions.value = false
}

function openSuggestionPicker(section, forEntryDialog = false) {
  suggestionTargetSection.value = section || ''
  suggestionSearch.value = ''
  suggestionTagFilter.value = ''
  suggestionPage.value = 1
  suggestionForEntryDialog.value = forEntryDialog
  showSuggestionPicker.value = true
}

function loadSuggestion(suggestion) {
  if (suggestionForEntryDialog.value && showEntryDialog.value) {
    editDraft.value = {
      ...editDraft.value,
      name: suggestion.name,
      amount: suggestion.amount || '',
      calories: Number(suggestion.calories) || 0,
      usePer100g: Boolean(suggestion.usePer100g),
      caloriesPer100g: suggestion.caloriesPer100g ?? null,
      section: editDraft.value.section || suggestionTargetSection.value || ''
    }
  } else {
    store.addDiaryEntry(selectedDate.value, {
      name: suggestion.name,
      amount: suggestion.amount || '',
      calories: Number(suggestion.calories),
      section: suggestionTargetSection.value,
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
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d.toISOString().split('T')[0]
}

function nextDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = d.toISOString().split('T')[0]
}

function onDateSelected() {
  showDatePicker.value = false
}

function formatDate(dateString) {
  return qDate.formatDate(dateString, 'MMM D, YYYY')
}

function openRecognition() {
  router.push({ path: '/diary/ai-recognition', query: { date: selectedDate.value } })
}
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

.btn-muted-green {
  background: #7da882;
  color: #fff;
}

.btn-muted-blue {
  background: #6f8fac;
  color: #fff;
}

.name-field-wrap {
  position: relative;
}

.name-suggestion-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 25;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
}
</style>
