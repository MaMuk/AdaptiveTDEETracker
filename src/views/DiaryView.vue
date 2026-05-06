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
      </q-card-actions>
    </q-card>

    <q-card class="q-pa-sm">
      <div v-for="(section, idx) in allSections" :key="section.value" class="section-block">
        <q-separator v-if="idx > 0" class="q-my-sm" />
        <div class="row items-center justify-between q-mb-xs">
          <div class="text-subtitle1">{{ section.label }}</div>
          <div class="row q-gutter-xs">
            <q-btn color="primary" unelevated dense icon="add" label="Add Row" @click="addRow(section.value)" />
            <q-btn color="dark" unelevated dense icon="restaurant_menu" label="Load Suggestions" @click="openSuggestionPicker(section.value)" />
          </div>
        </div>

        <q-markup-table flat bordered dense class="diary-table">
          <thead>
            <tr>
              <th class="text-left">Name</th>
              <th class="text-left">Amount</th>
              <th class="text-left">kcal</th>
              <th class="text-left">/100g</th>
              <th class="text-left">kcal/100g</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in entriesBySection(section.value)" :key="row.id">
              <td><q-input dense borderless v-model="row.name" @blur="saveRow(row, section.value)" /></td>
              <td><q-input dense borderless v-model="row.amount" :label="row.usePer100g ? 'grams' : ''" @blur="saveRow(row, section.value)" /></td>
              <td>
                <q-input dense borderless type="number" min="0" step="1" v-model.number="row.calories" :disable="row.usePer100g" @blur="saveRow(row, section.value)" />
              </td>
              <td>
                <q-checkbox v-model="row.usePer100g" @update:model-value="onPer100gToggle(row, section.value)" />
              </td>
              <td>
                <q-input dense borderless type="number" min="0" step="1" v-model.number="row.caloriesPer100g" :disable="!row.usePer100g" @blur="saveRow(row, section.value)" />
              </td>
              <td>
                <q-btn dense flat round icon="delete" color="negative" @click="confirmDeleteRow(row)" />
              </td>
            </tr>
            <tr v-if="entriesBySection(section.value).length === 0">
              <td colspan="6" class="text-grey-7">No entries in this section for this day.</td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </q-card>

    <QDialog v-model="showSuggestionPicker">
      <q-card style="min-width: 320px; width: 100%; max-width: 680px;">
        <q-card-section>
          <div class="text-h6">Suggestions</div>
        </q-card-section>
        <q-card-section class="row items-center q-gutter-sm q-pt-none">
          <q-input
            v-model="suggestionSearch"
            dense
            filled
            clearable
            label="Search suggestions"
            class="col"
          />
        </q-card-section>
        <q-card-section>
          <q-markup-table flat bordered>
            <thead>
              <tr>
                <th class="text-left">Name</th>
                <th class="text-left">Amount</th>
                <th class="text-left">kcal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="suggestion in rankedSuggestions" :key="suggestion.id">
                <td>{{ suggestion.name }}</td>
                <td>{{ suggestion.amount || '—' }}</td>
                <td>{{ suggestion.calories }}</td>
                <td>
                  <q-btn dense flat label="Use" color="primary" @click="loadSuggestion(suggestion)" />
                </td>
              </tr>
              <tr v-if="rankedSuggestions.length === 0">
                <td colspan="4" class="text-grey-7">No suggestions yet. Add diary rows and they will appear here.</td>
              </tr>
            </tbody>
          </q-markup-table>
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

const store = useUserStore()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const selectedDate = ref(route.query.date || new Date().toISOString().split('T')[0])
const showSuggestionPicker = ref(false)
const showDatePicker = ref(false)
const suggestionTargetSection = ref('')
const suggestionSearch = ref('')

const allSections = computed(() => ([
  { label: 'Unsectioned', value: '' },
  ...store.diarySections.map(section => ({ label: section, value: section }))
]))

const rankedSuggestions = computed(() => {
  const now = Date.now()
  const sectionKey = suggestionTargetSection.value || '__unsectioned__'
  const query = suggestionSearch.value.trim().toLowerCase()

  const withScore = store.foodSuggestions
    .filter(item => {
      if (!query) return true
      return String(item.name || '').toLowerCase().includes(query) || String(item.amount || '').toLowerCase().includes(query)
    })
    .map(item => {
      const usage = item.usage || { count: 0, lastUsedAt: null }
      const secUsage = (item.sectionUsage && item.sectionUsage[sectionKey]) || { count: 0, lastUsedAt: null }
      const updatedAtTs = item.updatedAt ? new Date(item.updatedAt).getTime() : 0
      const lastUsedTs = usage.lastUsedAt ? new Date(usage.lastUsedAt).getTime() : 0
      const secLastUsedTs = secUsage.lastUsedAt ? new Date(secUsage.lastUsedAt).getTime() : 0

      const recencyDays = lastUsedTs ? Math.max(0, (now - lastUsedTs) / 86400000) : 9999
      const sectionRecencyDays = secLastUsedTs ? Math.max(0, (now - secLastUsedTs) / 86400000) : 9999
      const updatedDays = updatedAtTs ? Math.max(0, (now - updatedAtTs) / 86400000) : 9999

      const score =
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

watch(selectedDate, date => {
  router.replace({ path: '/diary', query: { date } })
})

function entriesBySection(section) {
  return store.getDiaryEntriesByDateAndSection(selectedDate.value, section)
}

function addRow(section) {
  store.addDiaryEntry(selectedDate.value, {
    name: '',
    amount: '',
    calories: null,
    section,
    usePer100g: false,
    caloriesPer100g: null
  })
}

function calculateCaloriesForRow(row) {
  if (!row.usePer100g) return Number(row.calories) || 0
  const grams = Number(row.amount)
  const per100g = Number(row.caloriesPer100g)
  if (!Number.isFinite(grams) || grams < 0 || !Number.isFinite(per100g) || per100g < 0) {
    return Number(row.calories) || 0
  }
  return Math.round((grams * per100g) / 100)
}

function saveRow(row, section) {
  const name = String(row.name || '').trim()
  const amount = String(row.amount || '').trim()
  const caloriesPer100g = row.usePer100g ? Number(row.caloriesPer100g) : null
  const calories = row.usePer100g ? calculateCaloriesForRow(row) : Number(row.calories)

  if (!name) {
    $q.notify({ type: 'negative', message: 'Name is required.' })
    return
  }
  if (!Number.isFinite(calories) || calories < 0) {
    $q.notify({ type: 'negative', message: 'Calories must be a valid non-negative number.' })
    return
  }
  if (row.usePer100g && (!Number.isFinite(caloriesPer100g) || caloriesPer100g < 0)) {
    $q.notify({ type: 'negative', message: 'Calories per 100g must be valid when 100g mode is enabled.' })
    return
  }

  store.updateDiaryEntry(row.id, {
    name,
    amount,
    calories: Math.round(calories),
    section,
    usePer100g: row.usePer100g,
    caloriesPer100g
  })
}

function onPer100gToggle(row, section) {
  if (row.usePer100g) {
    row.calories = calculateCaloriesForRow(row)
  }
  saveRow(row, section)
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

function openSuggestionPicker(section) {
  suggestionTargetSection.value = section
  suggestionSearch.value = ''
  showSuggestionPicker.value = true
}

function loadSuggestion(suggestion) {
  store.addDiaryEntry(selectedDate.value, {
    name: suggestion.name,
    amount: suggestion.amount || '',
    calories: Number(suggestion.calories),
    section: suggestionTargetSection.value,
    usePer100g: Boolean(suggestion.usePer100g),
    caloriesPer100g: suggestion.caloriesPer100g
  })
  store.trackSuggestionLoad(suggestion.id, suggestionTargetSection.value)
  showSuggestionPicker.value = false
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
</script>

<style scoped>
.diary-page {
  padding-top: 8px;
}

.section-block {
  padding: 2px 0;
}

.diary-table :deep(thead tr th),
.diary-table :deep(tbody tr td) {
  padding-top: 6px;
  padding-bottom: 6px;
  white-space: nowrap;
}
</style>
