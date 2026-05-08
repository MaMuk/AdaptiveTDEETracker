<template>
  <q-page padding>
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">Profile</div>
        <q-input v-model.number="localStartWeight" type="number" label="Starting Weight (kg)" filled class="q-mb-sm" />
        <q-input v-model.number="localGoalWeight" type="number" label="Goal Weight (kg)" filled class="q-mb-sm" />
        <q-input v-model.number="localHeight" type="number" label="Height (cm)" filled class="q-mb-sm" />
      </q-card-section>
    </q-card>

    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">Goal Rate</div>
        <div class="text-caption q-mb-sm">Weekly weight change target</div>
        
        <q-select
          v-model="localWeeklyRate"
          :options="rateOptions"
          label="Rate (kg/week)"
          filled
          emit-value
          map-options
        />

        <q-input
          v-if="localWeeklyRate === 'custom'"
          v-model.number="customRate"
          type="number"
          label="Custom Rate (kg/week)"
          filled
          class="q-mt-sm"
          hint="Negative for loss, positive for gain"
        />
      </q-card-section>
    </q-card>
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">Food Diary</div>
        <div class="text-caption q-mb-sm">Optional offline diary that can fill calories into the daily log when you choose.</div>
        <q-toggle
          v-model="localFoodDiaryEnabled"
          label="Enable Food Diary"
          color="primary"
        />
        <q-input
          v-if="localFoodDiaryEnabled"
          v-model="localDiarySectionsText"
          type="text"
          label="Sections (comma separated)"
          filled
          class="q-mt-sm"
          hint="Example: Breakfast, Lunch, Dinner, Snacks"
        />
        <div v-if="localFoodDiaryEnabled" class="q-mt-md">
          <div class="text-caption q-mb-sm">Section calorie targets (% of daily calories)</div>
          <div v-for="field in sectionPercentageFields" :key="field.key" class="q-mb-sm">
            <q-input
              v-model.number="localSectionPercentages[field.key]"
              type="number"
              min="0"
              step="1"
              :label="`${field.label} (%)`"
              filled
            />
          </div>
          <div class="text-caption" :class="totalSectionPercentage === 100 ? 'text-positive' : 'text-warning'">
            Total: {{ totalSectionPercentage }}%
          </div>
        </div>
      </q-card-section>
    </q-card>
    <q-card class="q-mb-md" :class="{ 'disabled-card': !localFoodDiaryEnabled }">
      <q-card-section>
        <div class="text-subtitle1">Experimental AI</div>
        <div class="text-caption q-mb-sm">Experimental feature. Meal image is sent directly to OpenAI using your own API key.</div>
        <div v-if="!localFoodDiaryEnabled" class="text-caption text-grey-7 q-mb-sm">
          Enable Food Diary to use this feature.
        </div>
        <q-toggle
          v-model="localAiMealRecognitionEnabled"
          label="Activate experimental AI recognition"
          color="primary"
          :disable="!localFoodDiaryEnabled"
        />
        <q-input
          v-if="localAiMealRecognitionEnabled"
          v-model="localOpenAiApiKey"
          type="password"
          label="OpenAI API key"
          filled
          class="q-mt-sm"
          autocomplete="off"
          hint="Stored locally on this device."
          :disable="!localFoodDiaryEnabled"
        />
      </q-card-section>
    </q-card>
    <q-card class="q-mb-md">
      <q-card-actions>
        <q-btn color="positive" label="Save" @click="saveSettings" style="width: 33%;" />
        <q-space />
        <q-btn color="negative" label="Cancel" @click="cancelSettings" style="width: 33%;"/>
      </q-card-actions>

    </q-card>
    <!-- Reset Data -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">Danger Zone</div>
        <div class="text-caption q-mb-sm">Clear all data and start fresh</div>
      </q-card-section>
      <q-card-actions>
        <q-btn color="warning" label="Reset All Data" @click="resetData" class="full-width" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '../stores/user'

const router = useRouter()
const $q = useQuasar()
const store = useUserStore()

const rateOptions = [
  { label: '-0.25 kg/week', value: -0.25 },
  { label: '-0.5 kg/week', value: -0.5 },
  { label: '-0.75 kg/week', value: -0.75 },
  { label: '-1.0 kg/week', value: -1.0 },
  { label: 'Maintain', value: 0 },
  { label: '+0.25 kg/week', value: 0.25 },
  { label: '+0.5 kg/week', value: 0.5 },
  { label: 'Custom', value: 'custom' }
]

const localStartWeight = ref(null)
const localGoalWeight = ref(null)
const localHeight = ref(null)
const localWeeklyRate = ref(0.5)
const customRate = ref(0)
const localFoodDiaryEnabled = ref(false)
const localDiarySectionsText = ref('Breakfast, Lunch, Dinner, Snacks')
const localSectionPercentages = ref({})
const localAiMealRecognitionEnabled = ref(false)
const localOpenAiApiKey = ref('')

const originalValues = ref({})

onMounted(() => {
  localStartWeight.value = store.startWeight
  localGoalWeight.value = store.goalWeight
  localHeight.value = store.height
  
  if (!rateOptions.find(o => o.value === store.weeklyRate)) {
    customRate.value = store.weeklyRate
    localWeeklyRate.value = 'custom'
  } else {
    localWeeklyRate.value = store.weeklyRate
  }

  localFoodDiaryEnabled.value = store.foodDiaryEnabled
  localDiarySectionsText.value = (store.diarySections || []).join(', ')
  localSectionPercentages.value = { ...(store.diarySectionPercentages || {}) }
  localAiMealRecognitionEnabled.value = store.aiMealRecognitionEnabled
  localOpenAiApiKey.value = store.openAiApiKey
  
  originalValues.value = {
    startWeight: store.startWeight,
    goalWeight: store.goalWeight,
    height: store.height,
    weeklyRate: store.weeklyRate
  }
})

const parsedSections = computed(() => {
  const sections = localDiarySectionsText.value
    .split(',')
    .map(section => String(section || '').trim())
    .filter(section => section.length > 0)
  return sections.length > 0 ? [...new Set(sections)] : ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
})

const sectionPercentageFields = computed(() => ([
  { key: '__unsectioned__', label: 'Unsectioned' },
  ...parsedSections.value.map(section => ({ key: section, label: section }))
]))

const totalSectionPercentage = computed(() => sectionPercentageFields.value.reduce((sum, field) => {
  const value = Number(localSectionPercentages.value[field.key])
  return sum + (Number.isFinite(value) ? value : 0)
}, 0))

watch(sectionPercentageFields, fields => {
  const next = { ...localSectionPercentages.value }
  const evenValue = fields.length > 0 ? Math.round(100 / fields.length) : 0
  for (const field of fields) {
    const raw = Number(next[field.key])
    if (!Number.isFinite(raw) || raw < 0) {
      next[field.key] = evenValue
    }
  }
  const allowed = new Set(fields.map(field => field.key))
  for (const key of Object.keys(next)) {
    if (!allowed.has(key)) delete next[key]
  }
  localSectionPercentages.value = next
}, { immediate: true })

function saveSettings() {
  store.startWeight = localStartWeight.value
  store.goalWeight = localGoalWeight.value
  store.height = localHeight.value
  
  if (localWeeklyRate.value === 'custom') {
    store.weeklyRate = customRate.value
  } else {
    store.weeklyRate = localWeeklyRate.value
  }
  store.setFoodDiaryEnabled(localFoodDiaryEnabled.value)
  store.setDiarySections(localDiarySectionsText.value.split(','))
  for (const field of sectionPercentageFields.value) {
    store.setDiarySectionPercentage(field.key, Number(localSectionPercentages.value[field.key]) || 0)
  }
  if (!localFoodDiaryEnabled.value) {
    localAiMealRecognitionEnabled.value = false
    localOpenAiApiKey.value = ''
  }
  store.setAiMealRecognitionEnabled(localAiMealRecognitionEnabled.value)
  store.setOpenAiApiKey(localOpenAiApiKey.value)
  
  router.push('/')
}

function cancelSettings() {
  router.push('/')
}

function goBack() {
  router.push('/')
  router.push('/')
}

function resetData() {
  $q.dialog({
    title: 'Reset All Data',
    message: 'Are you sure you want to clear all log entries and user settings? This action cannot be undone.',
    cancel: true,
    persistent: true,
    ok: {
      label: 'Reset',
      color: 'negative'
    },
    cancel: {
      label: 'Cancel',
      color: 'positive'
    }
  }).onOk(() => {
    store.resetAll()
    localStartWeight.value = null
    localGoalWeight.value = null
    localHeight.value = null
    localWeeklyRate.value = 0.5
    customRate.value = 0
    localFoodDiaryEnabled.value = false
    localDiarySectionsText.value = 'Breakfast, Lunch, Dinner, Snacks'
    localSectionPercentages.value = { ...(store.diarySectionPercentages || {}) }
    localAiMealRecognitionEnabled.value = false
    localOpenAiApiKey.value = ''
    
    $q.notify({
      type: 'positive',
      message: 'All data has been reset',
      position: 'top'
    })
  })
}
</script>

<style scoped>
.disabled-card {
  opacity: 0.65;
}
</style>
