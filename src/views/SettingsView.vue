<template>
  <q-page padding>
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Profile
        </div>
        <q-input
          v-model.number="localStartWeight"
          type="number"
          label="Starting Weight (kg)"
          filled
          class="q-mb-sm"
        />
        <q-input
          v-model.number="localGoalWeight"
          type="number"
          label="Goal Weight (kg)"
          filled
          class="q-mb-sm"
        />
        <q-input
          v-model.number="localHeight"
          type="number"
          label="Height (cm)"
          filled
          class="q-mb-sm"
        />
      </q-card-section>
    </q-card>

    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Goal Rate
        </div>
        <div class="text-caption q-mb-sm">
          Weekly weight change target
        </div>
        
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
        <div class="text-caption q-mt-md">
          Startup activity assist (optional)
        </div>
        <q-toggle
          v-model="localStartupActivityEnabled"
          label="Use activity-based startup baseline"
          color="primary"
          class="q-mt-xs"
        />
        <q-select
          v-if="localStartupActivityEnabled"
          v-model="localStartupActivityLevel"
          :options="activityLevelOptions"
          label="Activity level"
          filled
          emit-value
          map-options
          class="q-mt-sm"
        />
        <q-input
          v-if="localStartupActivityEnabled"
          v-model.number="localAge"
          type="number"
          label="Age (years)"
          filled
          class="q-mt-sm"
        />
        <q-select
          v-if="localStartupActivityEnabled"
          v-model="localSex"
          :options="sexOptions"
          label="Sex"
          filled
          emit-value
          map-options
          class="q-mt-sm"
        />
        <q-banner
          v-if="localStartupActivityEnabled"
          rounded
          class="bg-blue-1 text-primary q-mt-sm"
        >
          Uses your profile and activity level to estimate maintenance calories and blends it with your log-based maintenance during startup. Set blend to 0 for log-only or 1 for activity-only.
        </q-banner>
        <div
          v-if="localStartupActivityEnabled"
          class="text-caption q-mt-md"
        >
          Startup blend (0 = log-based only, 1 = activity-based only)
        </div>
        <q-slider
          v-if="localStartupActivityEnabled"
          v-model="localTdeeManualBias"
          :min="0"
          :max="1"
          :step="0.01"
          label
          label-always
          class="q-mt-sm"
        />
      </q-card-section>
    </q-card>
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Food Diary
        </div>
        <div class="text-caption q-mb-sm">
          Optional offline diary that can fill calories into the daily log when you choose.
        </div>
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
        <div
          v-if="localFoodDiaryEnabled"
          class="q-mt-md"
        >
          <div class="text-caption q-mb-sm">
            Section calorie targets (% of daily calories)
          </div>
          <div
            v-for="field in sectionPercentageFields"
            :key="field.key"
            class="q-mb-sm"
          >
            <q-input
              v-model.number="localSectionPercentages[field.key]"
              type="number"
              min="0"
              step="1"
              :label="`${field.label} (%)`"
              filled
            />
          </div>
          <div
            class="text-caption"
            :class="totalSectionPercentage === 100 ? 'text-positive' : 'text-warning'"
          >
            Total: {{ totalSectionPercentage }}%
          </div>
        </div>
      </q-card-section>
    </q-card>
    <q-card
      class="q-mb-md"
      :class="{ 'disabled-card': !localFoodDiaryEnabled }"
    >
      <q-card-section>
        <div class="text-subtitle1">
          Experimental AI
        </div>
        <div class="text-caption q-mb-sm">
          Experimental feature. Meal image is sent directly to OpenAI using your own API key.
        </div>
        <div
          v-if="!localFoodDiaryEnabled"
          class="text-caption text-grey-7 q-mb-sm"
        >
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
        <q-btn
          color="positive"
          label="Save"
          style="width: 33%;"
          @click="saveSettings"
        />
        <q-space />
        <q-btn
          color="negative"
          label="Cancel"
          style="width: 33%;"
          @click="cancelSettings"
        />
      </q-card-actions>
    </q-card>
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Data Backup
        </div>
        <div class="text-caption q-mb-sm">
          Import/export data from a separate guided screen.
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn
          color="primary"
          label="Open Import / Export"
          class="full-width"
          @click="router.push('/settings/data-transfer')"
        />
      </q-card-actions>
    </q-card>
    <q-card
      v-if="devModeEnabled"
      class="q-mb-md"
    >
      <q-card-section>
        <div class="text-subtitle1">
          DEV: TDEE Debug
        </div>
        <div class="text-caption q-mb-sm">
          Anchor/effective/final values and adaptive metadata.
        </div>
        <div class="text-caption">
          Anchor baseline: {{ tdeeDebug.anchorBaseline }}
        </div>
        <div class="text-caption">
          Effective baseline: {{ tdeeDebug.effectiveBaseline }}
        </div>
        <div class="text-caption">
          Calculated TDEE: {{ tdeeDebug.calculatedTDEE }}
        </div>
        <div class="text-caption">
          Observed TDEE (capped/raw): {{ tdeeDebug.observedCapped }}
        </div>
        <div class="text-caption">
          Trust / mode / confidence: {{ tdeeDebug.trustMode }}
        </div>
        <div class="text-caption">
          Manual bias (applied trust): {{ tdeeDebug.manualBias }}
        </div>
        <div class="text-caption">
          Snapshot entries: {{ tdeeDebug.snapshotCount }}
        </div>
        <div class="text-caption">
          Latest snapshot date: {{ tdeeDebug.latestSnapshotDate }}
        </div>
      </q-card-section>
      <q-card-section>
        <div class="text-subtitle1">
          DEV: TDEE Scenarios
        </div>
        <div class="text-caption q-mb-sm">
          Temporary debug helpers. Each button overwrites logs with pseudo data so you can observe edge cases in the UI.
        </div>
        <q-btn
          flat
          color="negative"
          icon="visibility_off"
          label="Disable DEV mode"
          class="q-mb-sm"
          @click="disableDevMode"
        />
      </q-card-section>
      <q-list
        bordered
        separator
      >
        <q-item
          v-for="scenario in devScenarios"
          :key="scenario.key"
        >
          <q-item-section>
            <q-item-label>{{ scenario.label }}</q-item-label>
            <q-item-label caption>
              {{ scenario.description }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              color="primary"
              unelevated
              :label="scenario.buttonLabel"
              @click="applyDevScenario(scenario)"
            />
          </q-item-section>
        </q-item>
      </q-list>
      <q-card-section class="q-pt-md">
        <div class="text-subtitle1">
          DEV: Food Diary Scenarios
        </div>
        <div class="text-caption q-mb-sm">
          Loads diary-only fixtures (entries, closed sections, budget snapshots) to validate diary behavior across dates.
        </div>
      </q-card-section>
      <q-list
        bordered
        separator
      >
        <q-item
          v-for="scenario in devDiaryScenarios"
          :key="scenario.key"
        >
          <q-item-section>
            <q-item-label>{{ scenario.label }}</q-item-label>
            <q-item-label caption>
              {{ scenario.description }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              color="primary"
              unelevated
              :label="scenario.buttonLabel"
              @click="applyDevDiaryScenario(scenario)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
    <!-- Reset Data -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Danger Zone
        </div>
        <div class="text-caption q-mb-sm">
          Clear all data and start fresh
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn
          color="warning"
          label="Reset All Data"
          class="full-width"
          @click="resetData"
        />
      </q-card-actions>
    </q-card>
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Attribution
        </div>
        <div class="text-caption q-mb-sm">
          Built by
          <button
            class="name-tap-button"
            type="button"
            @click="handleNameTap"
          >
            {{ attributionName }}
          </button>.
        </div>
        <a
          :href="attributionUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary"
        >
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
const activityLevelOptions = [
  { label: 'Very low activity', value: 'very_low' },
  { label: 'Low activity', value: 'low' },
  { label: 'Moderate activity', value: 'moderate' },
  { label: 'High activity', value: 'high' },
  { label: 'Very high activity', value: 'very_high' }
]
const sexOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' }
]

const localStartWeight = ref(null)
const localGoalWeight = ref(null)
const localHeight = ref(null)
const localAge = ref(null)
const localSex = ref('male')
const localWeeklyRate = ref(0.5)
const customRate = ref(0)
const localFoodDiaryEnabled = ref(false)
const localDiarySectionsText = ref('Breakfast, Lunch, Dinner, Snacks')
const localSectionPercentages = ref({})
const localAiMealRecognitionEnabled = ref(false)
const localOpenAiApiKey = ref('')
const localTdeeManualBias = ref(0)
const localStartupActivityEnabled = ref(false)
const localStartupActivityLevel = ref('low')
const devModeEnabled = ref(false)
const nameTapCount = ref(0)
const attributionName = 'Martin Melmuk'
const attributionUrl = 'https://melmuk.at'
const devScenarioModule = ref(null)
const devScenarios = ref([])
const devDiaryScenarios = ref([])
const tdeeDebug = computed(() => {
  const details = store.tdeeDetails || {}
  const snapshots = store.tdeeSnapshotsByDate && typeof store.tdeeSnapshotsByDate === 'object'
    ? store.tdeeSnapshotsByDate
    : {}
  const snapshotDates = Object.keys(snapshots).sort()
  const latestSnapshotDate = snapshotDates.length > 0 ? snapshotDates[snapshotDates.length - 1] : '—'
  const asValue = (value, suffix = '') => Number.isFinite(Number(value)) ? `${Math.round(Number(value))}${suffix}` : '—'
  const asRaw = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value))}` : '—'
  const trust = Number.isFinite(Number(details.trust)) ? Number(details.trust).toFixed(3) : '—'

  return {
    anchorBaseline: asValue(details.anchorBaselineTDEE, ' kcal'),
    effectiveBaseline: asValue(details.effectiveBaselineTDEE, ' kcal'),
    calculatedTDEE: asValue(store.calculatedTDEE, ' kcal'),
    observedCapped: `${asRaw(details.cappedObservedTDEE)} / ${asRaw(details.observedTDEE)} kcal`,
    trustMode: `${trust} / ${details.mode || '—'} / ${details.confidence || '—'}`,
    manualBias: `${Number.isFinite(Number(details.manualBias)) ? Number(details.manualBias).toFixed(2) : '—'} -> ${Number.isFinite(Number(details.appliedManualBias)) ? Number(details.appliedManualBias).toFixed(3) : '—'} (${Number.isFinite(Number(details.effectiveTrust)) ? Number(details.effectiveTrust).toFixed(3) : '—'})`,
    snapshotCount: String(snapshotDates.length),
    latestSnapshotDate
  }
})

onMounted(() => {
  localStartWeight.value = store.startWeight
  localGoalWeight.value = store.goalWeight
  localHeight.value = store.height
  localAge.value = store.age
  localSex.value = store.sex || 'male'
  
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
  localTdeeManualBias.value = Number(store.tdeeManualBias) || 0
  localStartupActivityEnabled.value = Boolean(store.startupActivityEnabled)
  localStartupActivityLevel.value = store.startupActivityLevel || 'low'
  devModeEnabled.value = localStorage.getItem('tdee_dev_mode_enabled') === 'true'
  if (devModeEnabled.value) {
    ensureDevScenarioModuleLoaded()
  }
  
})

function handleNameTap() {
  if (devModeEnabled.value) return
  nameTapCount.value += 1
  if (nameTapCount.value >= 10) {
    devModeEnabled.value = true
    localStorage.setItem('tdee_dev_mode_enabled', 'true')
    ensureDevScenarioModuleLoaded()
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

watch(() => store.tdeeManualBias, value => {
  localTdeeManualBias.value = Number(value) || 0
})
watch(() => store.startupActivityEnabled, value => {
  localStartupActivityEnabled.value = Boolean(value)
})
watch(() => store.startupActivityLevel, value => {
  localStartupActivityLevel.value = value || 'low'
})

function saveSettings() {
  if (localStartupActivityEnabled.value) {
    const validAge = Number.isFinite(Number(localAge.value)) && Number(localAge.value) > 0
    const validSex = localSex.value === 'male' || localSex.value === 'female'
    if (!validAge || !validSex) {
      $q.notify({
        type: 'negative',
        message: 'Age and sex are required when startup activity assist is enabled.',
        position: 'top'
      })
      return
    }
  }

  store.startWeight = localStartWeight.value
  store.goalWeight = localGoalWeight.value
  store.height = localHeight.value
  store.age = localAge.value
  store.sex = localSex.value
  
  if (localWeeklyRate.value === 'custom') {
    store.weeklyRate = customRate.value
  } else {
    store.weeklyRate = localWeeklyRate.value
  }
  store.setTdeeManualBias(localTdeeManualBias.value)
  store.setStartupActivityEnabled(localStartupActivityEnabled.value)
  store.setStartupActivityLevel(localStartupActivityLevel.value)
  store.setFoodDiaryEnabled(localFoodDiaryEnabled.value)
  store.setDiarySections(localDiarySectionsText.value.split(','))
  for (const field of sectionPercentageFields.value) {
    store.setDiarySectionPercentage(field.key, Number(localSectionPercentages.value[field.key]) || 0)
  }
  if (!localFoodDiaryEnabled.value) {
    localAiMealRecognitionEnabled.value = false
    localOpenAiApiKey.value = ''
    localTdeeManualBias.value = 0
    localStartupActivityEnabled.value = false
  }
  store.setAiMealRecognitionEnabled(localAiMealRecognitionEnabled.value)
  store.setOpenAiApiKey(localOpenAiApiKey.value)
  
  router.push('/')
}

function cancelSettings() {
  router.push('/')
}

function resetData() {
  $q.dialog({
    title: 'Reset All Data',
    message: 'Are you sure you want to clear all log entries and user settings? This action cannot be undone.',
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
    localAge.value = null
    localSex.value = 'male'
    localWeeklyRate.value = 0.5
    customRate.value = 0
    localFoodDiaryEnabled.value = false
    localDiarySectionsText.value = 'Breakfast, Lunch, Dinner, Snacks'
    localSectionPercentages.value = { ...(store.diarySectionPercentages || {}) }
    localAiMealRecognitionEnabled.value = false
    localOpenAiApiKey.value = ''
    localTdeeManualBias.value = 0
    localStartupActivityEnabled.value = false
    localStartupActivityLevel.value = 'low'
    
    $q.notify({
      type: 'positive',
      message: 'All data has been reset',
      position: 'top'
    })
  })
}

function notifyDevLoaded(message) {
  $q.notify({
    type: 'positive',
    message,
    position: 'top'
  })
}

async function ensureDevScenarioModuleLoaded() {
  if (devScenarioModule.value) return devScenarioModule.value
  const mod = await import('../dev/settingsDevScenarios')
  devScenarioModule.value = mod
  devScenarios.value = mod.devScenarios
  devDiaryScenarios.value = mod.devDiaryScenarios
  return mod
}

async function applyDevScenario(scenario) {
  const mod = await ensureDevScenarioModuleLoaded()
  mod.applyDevScenario({ scenario, store, notify: notifyDevLoaded })
}

async function applyDevDiaryScenario(scenario) {
  const mod = await ensureDevScenarioModuleLoaded()
  mod.applyDevDiaryScenario({ scenario, store, notify: notifyDevLoaded })
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
