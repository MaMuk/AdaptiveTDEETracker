<template>
  <q-page padding>
    <q-card>
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-h6">
            Food Suggestions
          </div>
          <div class="text-caption">
            Independent library used to prefill diary rows
          </div>
        </div>
        <q-btn
          flat
          icon="arrow_back"
          label="Back"
          @click="router.push('/')"
        />
      </q-card-section>

      <q-card-section class="row q-col-gutter-sm q-pt-none">
        <div class="col-12 col-md-4">
          <q-input
            v-model="search"
            dense
            filled
            clearable
            label="Search name, notes, tags"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="tagFilter"
            dense
            filled
            clearable
            use-input
            input-debounce="0"
            label="Filter by tag"
            :options="allTags"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="calculatedFilter"
            dense
            filled
            emit-value
            map-options
            label="Calculated"
            :options="calculatedFilterOptions"
          />
        </div>
        <div class="col-12 col-md-2">
          <div class="row items-center no-wrap q-gutter-xs">
            <q-select
              class="col"
              v-model.number="pageSize"
              dense
              filled
              emit-value
              map-options
              label="Rows per page"
              :options="[{ label: '5', value: 5 }, { label: '10', value: 10 }, { label: '20', value: 20 }]"
            />
            <q-btn
              flat
              round
              dense
              icon="settings"
              aria-label="Configure visible columns"
            >
              <q-menu>
                <q-list
                  dense
                  style="min-width: 220px;"
                >
                  <q-item-label
                    header
                    class="text-caption"
                  >
                    Visible Columns
                  </q-item-label>
                  <q-item
                    v-for="column in columnOptions"
                    :key="column.key"
                    clickable
                    @click="toggleColumn(column.key)"
                  >
                    <q-item-section avatar>
                      <q-icon :name="visibleColumns[column.key] ? 'check_box' : 'check_box_outline_blank'" />
                    </q-item-section>
                    <q-item-section>{{ column.label }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
        </div>
      </q-card-section>

      <q-card-section>
        <q-markup-table
          flat
          bordered
        >
          <thead>
            <tr>
              <th
                v-if="visibleColumns.name"
                class="text-left"
              >
                Name
              </th>
              <th
                v-if="visibleColumns.amount"
                class="text-left"
              >
                Amount
              </th>
              <th
                v-if="visibleColumns.calories"
                class="text-left"
              >
                kcal
              </th>
              <th
                v-if="visibleColumns.usePer100g"
                class="text-left"
              >
                Calulated
              </th>
              <th
                v-if="visibleColumns.tags"
                class="text-left"
              >
                Tags
              </th>
              <th
                v-if="visibleColumns.notes"
                class="text-left"
              >
                Notes
              </th>
              <th class="text-right" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in pagedItems"
              :key="item.id"
            >
              <td v-if="visibleColumns.name">{{ item.name || '-' }}</td>
              <td v-if="visibleColumns.amount">{{ item.amount || '-' }}</td>
              <td v-if="visibleColumns.calories">{{ item.usePer100g ? item.caloriesPer100g : item.calories }}</td>
              <td v-if="visibleColumns.usePer100g">
                <q-icon
                  v-if="item.usePer100g"
                  name="calculate"
                />
              </td>
              <td v-if="visibleColumns.tags">{{ item.tagsCsv || '-' }}</td>
              <td v-if="visibleColumns.notes">{{ item.notes || '-' }}</td>
              <td class="text-right no-wrap">
                <div class="row justify-end items-center no-wrap q-gutter-xs">
                  <q-btn
                    dense
                    flat
                    round
                    icon="edit"
                    color="primary"
                    @click="openEditSuggestionDialog(item)"
                  />
                  <q-btn
                    dense
                    flat
                    round
                    icon="delete"
                    color="negative"
                    @click="remove(item)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="pagedItems.length === 0">
              <td
                :colspan="visibleColumnCount + 1"
                class="text-grey-7"
              >
                No suggestions found.
              </td>
            </tr>
          </tbody>
        </q-markup-table>

        <div class="row items-center justify-between q-mt-sm">
          <div class="row q-gutter-sm">
            <q-btn
              color="primary"
              label="Add Suggestion"
              @click="openAddSuggestionDialog"
            />
            <q-btn
              v-if="store.aiMealRecognitionEnabled"
              class="ai-magic-btn"
              unelevated
              icon="auto_awesome"
              label="Recognize to Add"
              @click="router.push('/suggestions/ai-recognition')"
            />
          </div>
          <q-pagination
            v-model="page"
            :max="maxPage"
            :max-pages="6"
            direction-links
            boundary-links
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog
      v-model="showSuggestionDialog"
      persistent
    >
      <q-card style="min-width: 320px; width: 100%; max-width: 640px;">
        <q-card-section>
          <div class="text-h6">
            {{ suggestionDraft.id ? 'Edit Suggestion' : 'New Suggestion' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-8">
              <q-input
                v-model="suggestionDraft.name"
                dense
                filled
                label="Name"
                autofocus
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="suggestionDraft.amount"
                dense
                filled
                label="Amount"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model.number="suggestionDraft.calories"
                dense
                filled
                type="number"
                min="0"
                step="1"
                label="Calories"
                :disable="suggestionDraft.usePer100g"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model.number="suggestionDraft.caloriesPer100g"
                dense
                filled
                type="number"
                min="0"
                step="1"
                label="Calories per 100 g"
                :disable="!suggestionDraft.usePer100g"
              />
            </div>
            <div class="col-12 col-md-4 flex items-center">
              <q-checkbox
                v-model="suggestionDraft.usePer100g"
              >
                <template #default>
                  <div class="row items-center no-wrap q-gutter-xs">
                    <q-icon name="calculate" />
                    <span>Calculated</span>
                  </div>
                </template>
              </q-checkbox>
            </div>
            <div class="col-12">
              <q-input
                v-model="suggestionDraft.tagsCsv"
                dense
                filled
                label="Tags"
                placeholder="protein, breakfast"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="suggestionDraft.notes"
                dense
                filled
                type="textarea"
                autogrow
                label="Notes"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            @click="closeSuggestionDialog"
          />
          <q-btn
            color="primary"
            :label="suggestionDraft.id ? 'Save' : 'Add'"
            @click="saveSuggestionDraft"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '../stores/user'

const store = useUserStore()
const router = useRouter()
const $q = useQuasar()

const search = ref('')
const tagFilter = ref('')
const calculatedFilterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Calculated only', value: 'calculated' },
  { label: 'Not calculated only', value: 'not_calculated' }
]
const calculatedFilter = ref('all')
const page = ref(1)
const pageSize = ref(10)
const columnOptions = [
  { key: 'name', label: 'Name' },
  { key: 'amount', label: 'Amount' },
  { key: 'calories', label: 'kcal' },
  { key: 'usePer100g', label: 'Calulated' },
  { key: 'tags', label: 'Tags' },
  { key: 'notes', label: 'Notes' }
]
const visibleColumns = computed(() => store.suggestionsVisibleColumns || {})
const showSuggestionDialog = ref(false)
const suggestionDraft = ref(defaultSuggestionDraft())

const rankedItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  const tag = tagFilter.value.trim().toLowerCase()

  const mapped = store.foodSuggestions
    .map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags : []
      const normalized = {
        ...item,
        notes: String(item.notes || ''),
        tags,
        tagsCsv: tags.join(', ')
      }

      const name = String(normalized.name || '').toLowerCase()
      const amount = String(normalized.amount || '').toLowerCase()
      const notes = String(normalized.notes || '').toLowerCase()
      const lowerTags = tags.map(x => String(x || '').toLowerCase())

      const matchesQuery = !q || name.includes(q) || amount.includes(q) || notes.includes(q) || lowerTags.some(t => t.includes(q))
      const matchesTag = !tag || lowerTags.includes(tag)
      const isCalculated = Boolean(normalized.usePer100g)
      const matchesCalculated = calculatedFilter.value === 'all'
        || (calculatedFilter.value === 'calculated' && isCalculated)
        || (calculatedFilter.value === 'not_calculated' && !isCalculated)
      const namePriority = q && name.includes(q) ? 10 : 0
      const notesPriority = q && notes.includes(q) ? 2 : 0
      const tagPriority = q && lowerTags.some(t => t.includes(q)) ? 3 : 0

      return { normalized, matchesQuery, matchesTag, matchesCalculated, score: namePriority + notesPriority + tagPriority }
    })
    .filter(entry => entry.matchesQuery && entry.matchesTag && entry.matchesCalculated)
    .sort((a, b) => b.score - a.score || String(a.normalized.name).localeCompare(String(b.normalized.name)))

  return mapped.map(entry => entry.normalized)
})

const allTags = computed(() => {
  const tags = new Set()
  for (const item of store.foodSuggestions) {
    for (const tag of (item.tags || [])) tags.add(String(tag))
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
})

const maxPage = computed(() => Math.max(1, Math.ceil(rankedItems.value.length / pageSize.value)))
const visibleColumnCount = computed(() => Object.values(visibleColumns.value).filter(Boolean).length)

const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return rankedItems.value.slice(start, start + pageSize.value)
})

watch([search, tagFilter, calculatedFilter, pageSize], () => {
  page.value = 1
})

function toggleColumn(key) {
  const current = Boolean(visibleColumns.value[key])
  const visibleCount = Object.values(visibleColumns.value).filter(Boolean).length
  if (current && visibleCount <= 1) return
  store.setSuggestionsVisibleColumns({
    ...visibleColumns.value,
    [key]: !current
  })
}

function parseTags(value) {
  return [...new Set(String(value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean))]
}

function defaultSuggestionDraft() {
  return {
    id: null,
    name: '',
    amount: '',
    calories: 0,
    usePer100g: false,
    caloriesPer100g: null,
    notes: '',
    tagsCsv: ''
  }
}

function openAddSuggestionDialog() {
  suggestionDraft.value = defaultSuggestionDraft()
  showSuggestionDialog.value = true
}

function openEditSuggestionDialog(item) {
  suggestionDraft.value = {
    id: item.id,
    name: String(item.name || ''),
    amount: String(item.amount || ''),
    calories: Number(item.calories) || 0,
    usePer100g: Boolean(item.usePer100g),
    caloriesPer100g: item.caloriesPer100g ?? null,
    notes: String(item.notes || ''),
    tagsCsv: String(item.tagsCsv || '')
  }
  showSuggestionDialog.value = true
}

function closeSuggestionDialog() {
  showSuggestionDialog.value = false
  suggestionDraft.value = defaultSuggestionDraft()
}

function saveSuggestionDraft() {
  const name = String(suggestionDraft.value.name || '').trim()
  const amount = String(suggestionDraft.value.amount || '').trim()
  const calories = Number(suggestionDraft.value.calories)
  const caloriesPer100g = Number(suggestionDraft.value.caloriesPer100g)
  const usePer100g = Boolean(suggestionDraft.value.usePer100g)

  if (!name) {
    $q.notify({ type: 'negative', message: 'Suggestion name is required.' })
    return
  }
  if (usePer100g && (!Number.isFinite(caloriesPer100g) || caloriesPer100g < 0)) {
    $q.notify({ type: 'negative', message: 'Calories per 100 g must be valid.' })
    return
  }
  if (!usePer100g && (!Number.isFinite(calories) || calories < 0)) {
    $q.notify({ type: 'negative', message: 'Calories must be valid.' })
    return
  }

  const payload = {
    name,
    amount,
    calories: usePer100g ? 0 : calories,
    usePer100g,
    caloriesPer100g: usePer100g ? caloriesPer100g : null,
    notes: String(suggestionDraft.value.notes || '').trim(),
    tags: parseTags(suggestionDraft.value.tagsCsv)
  }

  if (suggestionDraft.value.id) {
    store.updateSuggestion(suggestionDraft.value.id, payload)
  } else {
    store.addSuggestion(payload)
  }
  closeSuggestionDialog()
}

function remove(item) {
  $q.dialog({
    title: 'Delete Suggestion',
    message: item.name ? `Delete "${item.name}"?` : 'Delete this suggestion?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    store.deleteSuggestion(item.id)
  })
}
</script>
