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

      <q-card-section class="row items-center q-gutter-sm q-pt-none">
        <q-input
          v-model="nameSearch"
          dense
          filled
          clearable
          label="Search by name"
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
              <th class="text-left">/100g</th>
              <th class="text-left">Calories per 100 g</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td><q-input dense borderless v-model="item.name" @blur="save(item)" /></td>
              <td><q-input dense borderless v-model="item.amount" @blur="save(item)" /></td>
              <td><q-input dense borderless type="number" min="0" step="1" v-model.number="item.calories" :disable="item.usePer100g" @blur="save(item)" /></td>
              <td><q-checkbox v-model="item.usePer100g" @update:model-value="save(item)" /></td>
              <td><q-input dense borderless type="number" min="0" step="1" v-model.number="item.caloriesPer100g" :disable="!item.usePer100g" @blur="save(item)" /></td>
              <td>
                <q-btn dense flat round icon="delete" color="negative" @click="remove(item)" />
              </td>
            </tr>
            <tr v-if="filteredItems.length === 0">
              <td colspan="6" class="text-grey-7">No suggestions found.</td>
            </tr>
          </tbody>
        </q-markup-table>

        <div class="q-mt-sm row q-gutter-sm">
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
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '../stores/user'

const store = useUserStore()
const router = useRouter()
const $q = useQuasar()
const nameSearch = ref('')

const filteredItems = computed(() => {
  const q = nameSearch.value.trim().toLowerCase()
  if (!q) return store.foodSuggestions
  return store.foodSuggestions.filter(item => String(item.name || '').toLowerCase().includes(q))
})

function addSuggestion() {
  store.addSuggestion({
    name: 'New food',
    amount: '',
    calories: 0,
    usePer100g: false,
    caloriesPer100g: null
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
    caloriesPer100g: item.usePer100g ? Number(item.caloriesPer100g) : null
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
