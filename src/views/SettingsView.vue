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
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">Data Backup</div>
        <div class="text-caption q-mb-sm">Import/export data from a separate guided screen.</div>
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" label="Open Import / Export" @click="router.push('/settings/data-transfer')" class="full-width" />
      </q-card-actions>
    </q-card>
    <q-card v-if="devModeEnabled" class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">DEV: TDEE Scenarios</div>
        <div class="text-caption q-mb-sm">
          Temporary debug helpers. Each button overwrites logs with pseudo data so you can observe edge cases in the UI.
        </div>
        <q-btn flat color="negative" icon="visibility_off" label="Disable DEV mode" @click="disableDevMode" class="q-mb-sm" />
      </q-card-section>
      <q-list bordered separator>
        <q-item v-for="scenario in devScenarios" :key="scenario.key">
          <q-item-section>
            <q-item-label>{{ scenario.label }}</q-item-label>
            <q-item-label caption>{{ scenario.description }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn color="primary" unelevated :label="scenario.buttonLabel" @click="applyDevScenario(scenario)" />
          </q-item-section>
        </q-item>
      </q-list>
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
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">Attribution</div>
        <div class="text-caption q-mb-sm">
          Built by
          <button class="name-tap-button" type="button" @click="handleNameTap">{{ attributionName }}</button>.
        </div>
        <a :href="attributionUrl" target="_blank" rel="noopener noreferrer" class="text-primary">
          {{ attributionUrl }}
        </a>
      </q-card-section>
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
const devModeEnabled = ref(false)
const nameTapCount = ref(0)
const attributionName = 'Martin Melmuk'
const attributionUrl = 'https://melmuk.at'
const devScenarios = [
  {
    key: 'first-week-water',
    label: 'First Week Water Drop',
    buttonLabel: 'Load Scenario',
    description: '7 days, ~2.0 kg drop at ~2250 kcal/day. Useful to verify startup trust/cap avoids absurd TDEE spikes.',
    config: { startDate: '2026-01-01', days: 7, startWeight: 100, endWeight: 98, calories: 2250, weeklyRate: -0.5, goalWeight: 88, height: 182 }
  },
  {
    key: 'steady-five-weeks',
    label: 'Steady 5 Weeks',
    buttonLabel: 'Load Scenario',
    description: '35 days with moderate downward trend. Useful to confirm trust ramp shifts from baseline toward observed TDEE.',
    config: { startDate: '2026-01-01', days: 35, startWeight: 98, endWeight: 95.8, calories: 2250, weeklyRate: -0.5, goalWeight: 90, height: 180 }
  },
  {
    key: 'long-gap-new-epoch',
    label: 'Long Gap New Epoch',
    buttonLabel: 'Load Scenario',
    description: 'Two logging blocks separated by >28 days. Useful to verify current adaptation uses only the latest epoch.',
    config: { longGap: true, weeklyRate: -0.5, goalWeight: 84, height: 178 }
  },
  {
    key: 'high-confidence-rapid-loss',
    label: 'High Confidence Rapid Loss',
    buttonLabel: 'Load Scenario',
    description: '50 days with strong loss trend. Useful to inspect capped observed TDEE behavior in mature adaptation.',
    config: { startDate: '2026-01-01', days: 50, startWeight: 102, endWeight: 95, calories: 2300, weeklyRate: -0.75, goalWeight: 88, height: 184 }
  },
  {
    key: 'weight-gain-phase',
    label: 'Weight Gain Phase',
    buttonLabel: 'Load Scenario',
    description: '42 days gaining weight on a surplus. Useful to validate adaptive behavior in gain mode and calorie targets.',
    config: { startDate: '2026-01-01', days: 42, startWeight: 78, endWeight: 81, calories: 2900, weeklyRate: 0.25, goalWeight: 84, height: 176 }
  },
  {
    key: 'petite-person-cut',
    label: 'Petite Person Cut',
    buttonLabel: 'Load Scenario',
    description: 'Small body size with lower intake and gentle loss trend. Useful to validate lower-range TDEE behavior and targets.',
    config: { startDate: '2026-02-01', days: 42, startWeight: 50, endWeight: 48.9, calories: 1450, weeklyRate: -0.25, goalWeight: 46, height: 154 }
  },
  {
    key: 'elite-athlete-high-tdee',
    label: 'Elite Athlete High TDEE',
    buttonLabel: 'Load Scenario',
    description: 'High-calorie intake with stable/slight-loss trend over 8 weeks. Useful to verify that truly high TDEE can emerge at high confidence.',
    config: { startDate: '2026-01-01', days: 56, startWeight: 84, endWeight: 83.2, calories: 4100, weeklyRate: 0, goalWeight: 84, height: 186 }
  }
]

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
  devModeEnabled.value = localStorage.getItem('tdee_dev_mode_enabled') === 'true'
  
  originalValues.value = {
    startWeight: store.startWeight,
    goalWeight: store.goalWeight,
    height: store.height,
    weeklyRate: store.weeklyRate
  }
})

function handleNameTap() {
  if (devModeEnabled.value) return
  nameTapCount.value += 1
  if (nameTapCount.value >= 10) {
    devModeEnabled.value = true
    localStorage.setItem('tdee_dev_mode_enabled', 'true')
    $q.notify({
      type: 'positive',
      message: 'DEV mode enabled',
      position: 'top'
    })
    return
  }
  const remaining = 10 - nameTapCount.value
  if (remaining <= 3) {
    $q.notify({
      type: 'info',
      message: `${remaining} tap${remaining === 1 ? '' : 's'} to enable DEV mode`,
      position: 'top'
    })
  }
}

function disableDevMode() {
  devModeEnabled.value = false
  nameTapCount.value = 0
  localStorage.removeItem('tdee_dev_mode_enabled')
  $q.notify({
    type: 'positive',
    message: 'DEV mode disabled',
    position: 'top'
  })
}

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

function buildLogs({ startDate, days, startWeight, endWeight, calories }) {
  const out = []
  const start = new Date(startDate)
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const t = days <= 1 ? 1 : i / (days - 1)
    const weight = startWeight + ((endWeight - startWeight) * t)
    out.push({
      date: d.toISOString().slice(0, 10),
      weight: Number(weight.toFixed(2)),
      calories: Number(calories)
    })
  }
  return out
}

function buildLongGapLogs() {
  const firstEpoch = buildLogs({
    startDate: '2025-08-01',
    days: 45,
    startWeight: 96,
    endWeight: 94.8,
    calories: 2350
  })
  const secondEpoch = buildLogs({
    startDate: '2026-04-01',
    days: 14,
    startWeight: 90,
    endWeight: 89.6,
    calories: 2200
  })
  return [...firstEpoch, ...secondEpoch]
}

function applyDevScenario(scenario) {
  const { config } = scenario
  const logs = config.longGap ? buildLongGapLogs() : buildLogs(config)
  store.logs = logs
  store.startWeight = logs.length > 0 ? logs[0].weight : null
  store.goalWeight = Number(config.goalWeight ?? store.goalWeight ?? (store.startWeight ? store.startWeight - 8 : 80))
  store.height = Number(config.height ?? store.height ?? 178)
  store.weeklyRate = config.weeklyRate ?? store.weeklyRate
  store.updateTDEE()
  $q.notify({
    type: 'positive',
    message: `Loaded DEV scenario: ${scenario.label}`,
    position: 'top'
  })
}
</script>

<style scoped>
.disabled-card {
  opacity: 0.65;
}

.name-tap-button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  margin: 0;
  text-decoration: none;
  cursor: default;
}
</style>
