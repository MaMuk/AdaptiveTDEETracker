<template>
  <q-page padding>
    <q-card>
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-h6">Food Suggestions</div>
          <div class="text-caption">Independent library used to prefill diary rows</div>
        </div>
        <q-btn flat icon="arrow_back" label="Back" @click="router.push('/')" />
      </q-card-section>

      <q-card-section class="row q-col-gutter-sm q-pt-none">
        <div class="col-12 col-md-5">
          <q-input
            v-model="search"
            dense
            filled
            clearable
            label="Search name, notes, tags"
          />
        </div>
        <div class="col-12 col-md-4">
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
            v-model.number="pageSize"
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
              <th class="text-left">/100g</th>
              <th class="text-left">Calories per 100 g</th>
              <th class="text-left">Tags</th>
              <th class="text-left">Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pagedItems" :key="item.id">
              <td><q-input dense borderless v-model="item.name" @blur="save(item)" /></td>
              <td><q-input dense borderless v-model="item.amount" @blur="save(item)" /></td>
              <td><q-input dense borderless type="number" min="0" step="1" v-model.number="item.calories" :disable="item.usePer100g" @blur="save(item)" /></td>
              <td><q-checkbox v-model="item.usePer100g" @update:model-value="save(item)" /></td>
              <td><q-input dense borderless type="number" min="0" step="1" v-model.number="item.caloriesPer100g" :disable="!item.usePer100g" @blur="save(item)" /></td>
              <td><q-input dense borderless v-model="item.tagsCsv" placeholder="protein, breakfast" @blur="save(item)" /></td>
              <td><q-input dense borderless v-model="item.notes" @blur="save(item)" /></td>
              <td>
                <q-btn dense flat round icon="delete" color="negative" @click="remove(item)" />
              </td>
            </tr>
            <tr v-if="pagedItems.length === 0">
              <td colspan="8" class="text-grey-7">No suggestions found.</td>
            </tr>
          </tbody>
        </q-markup-table>

        <div class="row items-center justify-between q-mt-sm">
          <div class="row q-gutter-sm">
            <q-btn color="primary" label="Add Suggestion" @click="addSuggestion" />
            <q-btn
              v-if="store.aiMealRecognitionEnabled"
              class="ai-magic-btn"
              unelevated
              icon="auto_awesome"
              label="Recognize to Add"
              @click="router.push('/suggestions/ai-recognition')"
            />
          </div>
          <q-pagination v-model="page" :max="maxPage" :max-pages="6" direction-links boundary-links />
        </div>
      </q-card-section>
    </q-card>
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
const page = ref(1)
const pageSize = ref(10)

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
      const namePriority = q && name.includes(q) ? 10 : 0
      const notesPriority = q && notes.includes(q) ? 2 : 0
      const tagPriority = q && lowerTags.some(t => t.includes(q)) ? 3 : 0

      return { normalized, matchesQuery, matchesTag, score: namePriority + notesPriority + tagPriority }
    })
    .filter(entry => entry.matchesQuery && entry.matchesTag)
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

const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return rankedItems.value.slice(start, start + pageSize.value)
})

watch([search, tagFilter, pageSize], () => {
  page.value = 1
})

function parseTags(value) {
  return [...new Set(String(value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean))]
}

function addSuggestion() {
  store.addSuggestion({
    name: 'New food',
    amount: '',
    calories: 0,
    usePer100g: false,
    caloriesPer100g: null,
    notes: '',
    tags: []
  })
}

function save(item) {
  if (!String(item.name || '').trim()) {
    $q.notify({ type: 'negative', message: 'Suggestion name is required.' })
    return
  }
  if (item.usePer100g && (!Number.isFinite(Number(item.caloriesPer100g)) || Number(item.caloriesPer100g) < 0)) {
    $q.notify({ type: 'negative', message: 'Calories per 100 g must be valid.' })
    return
  }
  if (!item.usePer100g && (!Number.isFinite(Number(item.calories)) || Number(item.calories) < 0)) {
    $q.notify({ type: 'negative', message: 'Calories must be valid.' })
    return
  }

  store.updateSuggestion(item.id, {
    name: String(item.name || '').trim(),
    amount: String(item.amount || '').trim(),
    calories: Number(item.calories),
    usePer100g: Boolean(item.usePer100g),
    caloriesPer100g: item.usePer100g ? Number(item.caloriesPer100g) : null,
    notes: String(item.notes || '').trim(),
    tags: parseTags(item.tagsCsv)
  })
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
