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
import { ref, onMounted } from 'vue'
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
  
  originalValues.value = {
    startWeight: store.startWeight,
    goalWeight: store.goalWeight,
    height: store.height,
    weeklyRate: store.weeklyRate
  }
})

function saveSettings() {
  store.startWeight = localStartWeight.value
  store.goalWeight = localGoalWeight.value
  store.height = localHeight.value
  
  if (localWeeklyRate.value === 'custom') {
    store.weeklyRate = customRate.value
  } else {
    store.weeklyRate = localWeeklyRate.value
  }
  
  router.push('/')
  if (localWeeklyRate.value === 'custom') {
    store.weeklyRate = customRate.value
  } else {
    store.weeklyRate = localWeeklyRate.value
  }
  
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
    
    $q.notify({
      type: 'positive',
      message: 'All data has been reset',
      position: 'top'
    })
  })
}
</script>
