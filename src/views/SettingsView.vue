<template>
  <q-page
    padding
    data-tour="settings-page"
  >
    <q-card
      data-tour="settings-profile"
      class="q-mb-md"
    >
      <q-card-section>
        <div class="text-subtitle1">
          Profile
        </div>
        <ProfileGoalFields
          :start-weight="localStartWeight"
          :goal-weight="localGoalWeight"
          :height="localHeight"
          :profile-measurement-system="localProfileMeasurementSystem"
          :profile-measurement-system-options="measurementSystemOptions"
          :show-rate-fields="false"
          @update:profile-measurement-system="localProfileMeasurementSystem = $event"
          @update:start-weight="localStartWeight = $event"
          @update:goal-weight="localGoalWeight = $event"
          @update:height="localHeight = $event"
        />
      </q-card-section>
    </q-card>

    <q-card
      data-tour="settings-startup-assist"
      class="q-mb-md"
    >
      <q-card-section>
        <div class="text-subtitle1">
          Goal Rate
        </div>
        <div class="text-caption q-mb-sm">
          Weekly weight change target
        </div>
        <ProfileGoalFields
          :start-weight="localStartWeight"
          :goal-weight="localGoalWeight"
          :profile-measurement-system="localProfileMeasurementSystem"
          :weekly-rate="localWeeklyRate"
          :custom-rate="customRate"
          :body-weight-for-rate="store.averageWeight ?? localStartWeight"
          :rate-options="rateOptions"
          :show-profile-fields="false"
          @update:weekly-rate="localWeeklyRate = $event"
          @update:custom-rate="customRate = $event"
        />
        <StartupAssistFields
          class="q-mt-md"
          :enabled="localStartupActivityEnabled"
          :activity-level="localStartupActivityLevel"
          :age="localAge"
          :sex="localSex"
          :tdee-manual-bias="localTdeeManualBias"
          :tdee-smoothing-window-weeks="localTdeeSmoothingWindowWeeks"
          :activity-level-options="activityLevelOptions"
          :sex-options="sexOptions"
          @update:enabled="localStartupActivityEnabled = $event"
          @update:activity-level="localStartupActivityLevel = $event"
          @update:age="localAge = $event"
          @update:sex="localSex = $event"
          @update:tdee-manual-bias="localTdeeManualBias = $event"
          @update:tdee-smoothing-window-weeks="localTdeeSmoothingWindowWeeks = $event"
        />
      </q-card-section>
    </q-card>
    <q-card
      data-tour="settings-diary"
      class="q-mb-md"
    >
      <q-card-section>
        <div class="text-subtitle1">
          Food Diary
        </div>
        <DiaryFields
          :enabled="localFoodDiaryEnabled"
          :macro-tracking-enabled="localDiaryMacroTrackingEnabled"
          :sections-text="localDiarySectionsText"
          :section-percentage-fields="sectionPercentageFields"
          :section-percentages="localSectionPercentages"
          :total-section-percentage="totalSectionPercentage"
          :measurement-system="localMeasurementSystem"
          :measurement-units="localMeasurementUnits"
          :measurement-system-options="measurementSystemOptions"
          @update:enabled="localFoodDiaryEnabled = $event"
          @update:sections-text="localDiarySectionsText = $event"
          @update:section-percentage="onSectionPercentageUpdate"
          @update:measurement-system="applyMeasurementPreset"
          @update:measurement-units="localMeasurementUnits = $event"
          @update:macro-tracking-enabled="localDiaryMacroTrackingEnabled = $event"
        />
      </q-card-section>
    </q-card>
    <q-card
      data-tour="settings-ai"
      class="q-mb-md"
      :class="{ 'disabled-card': !localFoodDiaryEnabled }"
    >
      <q-card-section>
        <div class="text-subtitle1">
          Experimental AI
        </div>
        <ExperimentalAiFields
          :food-diary-enabled="localFoodDiaryEnabled"
          :ai-enabled="localAiMealRecognitionEnabled"
          :open-ai-api-key="localOpenAiApiKey"
          @update:ai-enabled="localAiMealRecognitionEnabled = $event"
          @update:open-ai-api-key="localOpenAiApiKey = $event"
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
          Guided Tour
        </div>
        <div class="text-caption q-mb-sm">
          Start the in-app tour from Tracker, then continue through Diary and Settings.
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn
          data-tour="settings-start-tour"
          color="primary"
          label="Start Guided Tour"
          class="full-width"
          @click="startTour"
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
          Averaging window: {{ tdeeDebug.smoothingWindow }}
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
          Reset App Data
        </div>
        <div class="text-caption q-mb-sm">
          Clears all saved data from this device and restarts the guided setup. Use with care.
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
          Information
        </div>
        <div class="text-caption q-mb-sm">
          Version {{ appVersion }}
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
import { startGuidedProductTour } from '../services/guidedTour'
import { getPrimaryPresetUnits } from '../utils/unitLibrary'
import { TDEE_SMOOTHING_WINDOW_WEEKS } from '../utils/tdee'
import packageJson from '../../package.json'
import ProfileGoalFields from '../components/setup/ProfileGoalFields.vue'
import StartupAssistFields from '../components/setup/StartupAssistFields.vue'
import DiaryFields from '../components/setup/DiaryFields.vue'
import ExperimentalAiFields from '../components/setup/ExperimentalAiFields.vue'

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
const measurementSystemOptions = [
  { label: 'Metric', value: 'metric' },
  { label: 'Imperial', value: 'imperial' }
]

const localStartWeight = ref(null)
const localGoalWeight = ref(null)
const localHeight = ref(null)
const localAge = ref(null)
const localSex = ref('male')
const localWeeklyRate = ref(0.5)
const customRate = ref(0)
const localFoodDiaryEnabled = ref(false)
const localDiaryMacroTrackingEnabled = ref(false)
const localDiarySectionsText = ref('Breakfast, Lunch, Dinner, Snacks')
const localSectionPercentages = ref({})
const localAiMealRecognitionEnabled = ref(false)
const localOpenAiApiKey = ref('')
const localTdeeManualBias = ref(0)
const localTdeeSmoothingWindowWeeks = ref(TDEE_SMOOTHING_WINDOW_WEEKS)
const localStartupActivityEnabled = ref(false)
const localStartupActivityLevel = ref('low')
const localMeasurementSystem = ref('metric')
const localProfileMeasurementSystem = ref('metric')
const localMeasurementUnits = ref(['g', 'ml', 'serving'])
const devModeEnabled = ref(false)
const nameTapCount = ref(0)
const attributionName = 'Martin Melmuk'
const attributionUrl = 'https://melmuk.at'
const appVersion = packageJson.version || 'unknown'
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
    smoothingWindow: Number.isFinite(Number(details.smoothingWindowWeeks)) ? `${Math.round(Number(details.smoothingWindowWeeks))} weeks` : '—',
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
  localDiaryMacroTrackingEnabled.value = store.diaryMacroTrackingEnabled
  localDiarySectionsText.value = (store.diarySections || []).join(', ')
  localSectionPercentages.value = { ...(store.diarySectionPercentages || {}) }
  localAiMealRecognitionEnabled.value = store.aiMealRecognitionEnabled
  localOpenAiApiKey.value = store.openAiApiKey
  localTdeeManualBias.value = Number(store.tdeeManualBias) || 0
  localTdeeSmoothingWindowWeeks.value = Number(store.tdeeSmoothingWindowWeeks) || TDEE_SMOOTHING_WINDOW_WEEKS
  localStartupActivityEnabled.value = Boolean(store.startupActivityEnabled)
  localStartupActivityLevel.value = store.startupActivityLevel || 'low'
  localMeasurementSystem.value = store.measurementSystem || 'metric'
  localProfileMeasurementSystem.value = store.profileMeasurementSystem || 'metric'
  localMeasurementUnits.value = (Array.isArray(store.measurementUnits) && store.measurementUnits.length > 0
    ? store.measurementUnits
    : getPrimaryPresetUnits(localMeasurementSystem.value))
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
watch(() => store.tdeeSmoothingWindowWeeks, value => {
  localTdeeSmoothingWindowWeeks.value = Number(value) || TDEE_SMOOTHING_WINDOW_WEEKS
})
watch(() => store.startupActivityEnabled, value => {
  localStartupActivityEnabled.value = Boolean(value)
})
watch(() => store.startupActivityLevel, value => {
  localStartupActivityLevel.value = value || 'low'
})

function applyMeasurementPreset(system) {
  localMeasurementSystem.value = system === 'imperial' ? 'imperial' : 'metric'
  localMeasurementUnits.value = getPrimaryPresetUnits(localMeasurementSystem.value)
}

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
  store.setTdeeSmoothingWindowWeeks(localTdeeSmoothingWindowWeeks.value)
  store.setStartupActivityEnabled(localStartupActivityEnabled.value)
  store.setStartupActivityLevel(localStartupActivityLevel.value)
  store.setFoodDiaryEnabled(localFoodDiaryEnabled.value)
  store.setDiaryMacroTrackingEnabled(localDiaryMacroTrackingEnabled.value)
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
  store.setMeasurementSystem(localMeasurementSystem.value)
  store.setProfileMeasurementSystem(localProfileMeasurementSystem.value)
  store.setMeasurementUnits(localMeasurementUnits.value)
  
  router.push('/')
}

function cancelSettings() {
  router.push('/')
}

function resetData() {
  $q.dialog({
    title: 'Reset All Data',
    message: 'This removes all logs and settings from this device and starts the guided setup again. This cannot be undone.',
    persistent: true,
    ok: {
      label: 'Reset',
      color: 'warning'
    },
    cancel: {
      label: 'Cancel',
      color: 'primary'
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
    localDiaryMacroTrackingEnabled.value = false
    localDiarySectionsText.value = 'Breakfast, Lunch, Dinner, Snacks'
    localSectionPercentages.value = { ...(store.diarySectionPercentages || {}) }
    localAiMealRecognitionEnabled.value = false
    localOpenAiApiKey.value = ''
    localTdeeManualBias.value = 0
    localStartupActivityEnabled.value = false
    localStartupActivityLevel.value = 'low'
    
    $q.notify({
      type: 'positive',
      message: 'All data removed. Guided setup is ready to start again.',
      position: 'top'
    })

    router.replace('/onboarding')
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

function onSectionPercentageUpdate({ key, value }) {
  localSectionPercentages.value = {
    ...localSectionPercentages.value,
    [key]: Number(value) || 0
  }
}

async function startTour() {
  await startGuidedProductTour({
    router,
    store,
    onFinish: () => {
      store.setGuidedTourCompleted(true)
    }
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
