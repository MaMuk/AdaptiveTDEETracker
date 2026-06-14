<template>
  <q-page
    padding
    class="onboarding-page"
  >
    <q-card>
      <q-card-section>
        <div class="text-h6">
          Setup
        </div>
        <div class="text-caption text-grey-7">
          Complete initial configuration before using the app.
        </div>
      </q-card-section>

      <q-card-section>
        <q-stepper
          v-model="step"
          flat
          animated
          color="primary"
          :vertical="$q.screen.lt.sm"
        >
          <q-step
            :name="1"
            title="Start"
            icon="play_circle"
            :done="step > 1"
          >
            <div class="text-body2 q-mb-md">
              You can import an existing JSON backup instead of manual setup.
            </div>
            <q-btn
              icon="upload_file"
              label="Import JSON Backup"
              class="bg-pink text-white q-mb-md"
              @click="router.push('/settings/data-transfer')"
            />
            <div class="text-caption text-grey-7">
              Import a backup, continue with the guided setup, or skip for now and configure everything later in Settings.
            </div>
          </q-step>

          <q-step
            :name="2"
            title="Profile"
            icon="person"
            :done="step > 2"
          >
            <ProfileGoalFields
              :start-weight="localStartWeight"
              :goal-weight="localGoalWeight"
              :height="localHeight"
              :profile-measurement-system="localProfileMeasurementSystem"
              :profile-measurement-system-options="measurementSystemOptions"
              :weekly-rate="localWeeklyRate"
              :custom-rate="customRate"
              :body-weight-for-rate="store.averageWeight ?? localStartWeight"
              :rate-options="rateOptions"
              @update:profile-measurement-system="localProfileMeasurementSystem = $event"
              @update:start-weight="localStartWeight = $event"
              @update:goal-weight="localGoalWeight = $event"
              @update:height="localHeight = $event"
              @update:weekly-rate="localWeeklyRate = $event"
              @update:custom-rate="customRate = $event"
            />
          </q-step>

          <q-step
            :name="3"
            title="Diary & AI"
            icon="check_circle"
            :done="step > 3"
          >
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
            <ExperimentalAiFields
              class="q-mt-md"
              :food-diary-enabled="localFoodDiaryEnabled"
              :ai-enabled="localAiMealRecognitionEnabled"
              :open-ai-api-key="localOpenAiApiKey"
              @update:ai-enabled="localAiMealRecognitionEnabled = $event"
              @update:open-ai-api-key="localOpenAiApiKey = $event"
            />
          </q-step>

          <q-step
            :name="4"
            title="Assist"
            icon="directions_run"
          >
            <div class="text-body2 q-mb-sm">
              Assist helps stabilize calorie estimates during your first weeks of tracking by blending:
              your profile-based maintenance estimate and your log-based trend estimate.
            </div>
            <div class="text-caption text-grey-7 q-mb-sm">
              Set blend to <strong>0</strong> for log-only, <strong>1</strong> for profile/activity-only, or keep it in between for a mixed estimate while data is still sparse.
            </div>
            <StartupAssistFields
              :enabled="enableStartupAssist"
              :activity-level="localStartupActivityLevel"
              :age="localAge"
              :sex="localSex"
              :tdee-manual-bias="localTdeeManualBias"
              :activity-level-options="activityLevelOptions"
              :sex-options="sexOptions"
              :show-enable-toggle="true"
              :show-banner="false"
              caption="Optional support during early tracking."
              enable-label="Enable startup activity assist"
              @update:enabled="enableStartupAssist = $event"
              @update:activity-level="localStartupActivityLevel = $event"
              @update:age="localAge = $event"
              @update:sex="localSex = $event"
              @update:tdee-manual-bias="localTdeeManualBias = $event"
            />
          </q-step>

          <template #navigation>
            <q-stepper-navigation class="row items-center">
              <q-btn
                v-if="step > 1"
                flat
                color="primary"
                label="Back"
                @click="step -= 1"
              />
              <q-btn
                v-if="step === 1"
                flat
                color="primary"
                label="Skip Setup"
                @click="skipSetup"
              />
              <q-space />
              <q-btn
                v-if="step < 4"
                color="primary"
                label="Next"
                :disable="!canProceedStep"
                @click="step += 1"
              />
              <q-btn
                v-if="step === 4"
                unelevated
                label="Skip and Finish"
                class="bg-grey text-white q-mr-sm"
                @click="skipStartupAssist"
              />
              <q-btn
                v-if="step === 4"
                color="positive"
                label="Finish Setup"
                :disable="!canFinishSetup"
                @click="finishSetup"
              />
            </q-stepper-navigation>
          </template>
        </q-stepper>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '../stores/user'
import { getPrimaryPresetUnits } from '../utils/unitLibrary'
import ProfileGoalFields from '../components/setup/ProfileGoalFields.vue'
import StartupAssistFields from '../components/setup/StartupAssistFields.vue'
import DiaryFields from '../components/setup/DiaryFields.vue'
import ExperimentalAiFields from '../components/setup/ExperimentalAiFields.vue'

const router = useRouter()
const $q = useQuasar()
const store = useUserStore()

const step = ref(1)
const localStartWeight = ref(null)
const localGoalWeight = ref(null)
const localHeight = ref(null)
const localWeeklyRate = ref(-0.5)
const customRate = ref(-0.5)

const localAge = ref(null)
const localSex = ref('male')
const localStartupActivityLevel = ref('low')
const localTdeeManualBias = ref(1)
const enableStartupAssist = ref(true)

const localFoodDiaryEnabled = ref(true)
const localDiaryMacroTrackingEnabled = ref(false)
const localDiarySectionsText = ref('Breakfast, Lunch, Dinner, Snacks')
const localSectionPercentages = ref({})
const localAiMealRecognitionEnabled = ref(false)
const localOpenAiApiKey = ref('')
const localMeasurementSystem = ref('metric')
const localProfileMeasurementSystem = ref('metric')
const localMeasurementUnits = ref(['g', 'ml', 'serving'])

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

onMounted(() => {
  const isFreshSetup = !store.setupCompleted
  localStartWeight.value = store.startWeight
  localGoalWeight.value = store.goalWeight
  localHeight.value = store.height
  localAge.value = store.age
  localSex.value = store.sex || 'male'
  localWeeklyRate.value = Number.isFinite(Number(store.weeklyRate)) ? store.weeklyRate : -0.5
  localStartupActivityLevel.value = store.startupActivityLevel || 'low'
  localTdeeManualBias.value = isFreshSetup
    ? 1
    : (Number.isFinite(Number(store.tdeeManualBias)) ? Number(store.tdeeManualBias) : 1)
  enableStartupAssist.value = isFreshSetup ? true : Boolean(store.startupActivityEnabled)
  localFoodDiaryEnabled.value = isFreshSetup ? true : Boolean(store.foodDiaryEnabled)
  localDiaryMacroTrackingEnabled.value = isFreshSetup ? false : Boolean(store.diaryMacroTrackingEnabled)
  localDiarySectionsText.value = (store.diarySections || []).join(', ')
  localSectionPercentages.value = { ...(store.diarySectionPercentages || {}) }
  localAiMealRecognitionEnabled.value = isFreshSetup ? false : Boolean(store.aiMealRecognitionEnabled)
  localOpenAiApiKey.value = isFreshSetup ? '' : (store.openAiApiKey || '')
  localMeasurementSystem.value = store.measurementSystem || 'metric'
  localProfileMeasurementSystem.value = store.profileMeasurementSystem || 'metric'
  localMeasurementUnits.value = (Array.isArray(store.measurementUnits) && store.measurementUnits.length > 0
    ? store.measurementUnits
    : getPrimaryPresetUnits(localMeasurementSystem.value))
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

const profileStepValid = computed(() => {
  const start = Number(localStartWeight.value)
  const goal = Number(localGoalWeight.value)
  const height = Number(localHeight.value)
  if (!Number.isFinite(start) || !Number.isFinite(goal) || !Number.isFinite(height)) return false
  if (height <= 0) return false
  if (localWeeklyRate.value === 'custom') {
    const custom = Number(customRate.value)
    if (!Number.isFinite(custom)) return false
    if (goal < start && custom >= 0) return false
    if (goal > start && custom <= 0) return false
    if (goal === start && custom !== 0) return false
  }
  return true
})

const diaryStepValid = computed(() => {
  if (!localFoodDiaryEnabled.value) return true
  if (parsedSections.value.length === 0) return false
  const percentagesValid = sectionPercentageFields.value.every(field => Number.isFinite(Number(localSectionPercentages.value[field.key])))
  if (!percentagesValid) return false
  if (localAiMealRecognitionEnabled.value && !String(localOpenAiApiKey.value || '').trim()) return false
  return true
})

const startupStepValid = computed(() => {
  if (!enableStartupAssist.value) return true
  const validAge = Number.isFinite(Number(localAge.value)) && Number(localAge.value) > 0
  const validSex = localSex.value === 'male' || localSex.value === 'female'
  const validLevel = activityLevelOptions.some(option => option.value === localStartupActivityLevel.value)
  return validAge && validSex && validLevel
})

const canProceedStep = computed(() => {
  if (step.value === 1) return true
  if (step.value === 2) return profileStepValid.value
  if (step.value === 3) return diaryStepValid.value
  return true
})

const canFinishSetup = computed(() => profileStepValid.value && diaryStepValid.value && startupStepValid.value)

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

function skipStartupAssist() {
  enableStartupAssist.value = false
  finishSetup()
}

function skipSetup() {
  store.setSetupCompleted(true)
  store.setGuidedTourCompleted(false)
  store.setDisclaimerAccepted(false)
  router.replace('/welcome')
}

function onSectionPercentageUpdate({ key, value }) {
  localSectionPercentages.value = {
    ...localSectionPercentages.value,
    [key]: Number(value) || 0
  }
}

function applyMeasurementPreset(system) {
  localMeasurementSystem.value = system === 'imperial' ? 'imperial' : 'metric'
  localMeasurementUnits.value = getPrimaryPresetUnits(localMeasurementSystem.value)
}

function finishSetup() {
  if (!canFinishSetup.value) {
    $q.notify({
      type: 'negative',
      message: 'Please complete all required fields before finishing setup.',
      position: 'top'
    })
    return
  }

  store.startWeight = localStartWeight.value
  store.goalWeight = localGoalWeight.value
  store.height = localHeight.value
  store.age = localAge.value
  store.sex = localSex.value
  store.weeklyRate = localWeeklyRate.value === 'custom' ? customRate.value : localWeeklyRate.value

  store.setStartupActivityEnabled(enableStartupAssist.value)
  store.setStartupActivityLevel(localStartupActivityLevel.value)
  store.setTdeeManualBias(enableStartupAssist.value ? localTdeeManualBias.value : 0)

  store.setFoodDiaryEnabled(localFoodDiaryEnabled.value)
  store.setDiaryMacroTrackingEnabled(localFoodDiaryEnabled.value ? localDiaryMacroTrackingEnabled.value : false)
  store.setDiarySections(localDiarySectionsText.value.split(','))
  for (const field of sectionPercentageFields.value) {
    store.setDiarySectionPercentage(field.key, Number(localSectionPercentages.value[field.key]) || 0)
  }
  store.setAiMealRecognitionEnabled(localFoodDiaryEnabled.value ? localAiMealRecognitionEnabled.value : false)
  store.setOpenAiApiKey(localFoodDiaryEnabled.value && localAiMealRecognitionEnabled.value ? localOpenAiApiKey.value : '')
  store.setMeasurementSystem(localMeasurementSystem.value)
  store.setProfileMeasurementSystem(localProfileMeasurementSystem.value)
  store.setMeasurementUnits(localMeasurementUnits.value)

  store.setSetupCompleted(true)
  store.setGuidedTourCompleted(false)
  store.setDisclaimerAccepted(false)

  $q.notify({
    type: 'positive',
    message: 'Setup completed',
    position: 'top'
  })

  router.replace('/welcome')
}
</script>

<style scoped>
.onboarding-page {
  max-width: 720px;
  margin: 0 auto;
}
</style>
