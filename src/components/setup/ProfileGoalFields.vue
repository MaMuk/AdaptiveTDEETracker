<template>
  <template v-if="showProfileFields">
    <div class="text-caption text-grey-7 q-mb-xs">
      Profile Units
    </div>
    <q-btn-toggle
      :model-value="profileMeasurementSystem"
      unelevated
      toggle-color="primary"
      color="grey-3"
      text-color="dark"
      spread
      class="q-mb-sm"
      :options="profileMeasurementSystemOptions"
      @update:model-value="emit('update:profileMeasurementSystem', $event)"
    />
    <q-input
      v-if="isImperial"
      :model-value="startWeightLb"
      type="number"
      label="Starting Weight (lb)"
      filled
      class="q-mb-sm"
      @update:model-value="startWeightLb = toNumberOrNull($event)"
    />
    <q-input
      v-else
      :model-value="startWeight"
      type="number"
      label="Starting Weight (kg)"
      filled
      class="q-mb-sm"
      @update:model-value="emit('update:startWeight', toNumberOrNull($event))"
    />
    <q-input
      v-if="isImperial"
      :model-value="goalWeightLb"
      type="number"
      label="Goal Weight (lb)"
      filled
      class="q-mb-sm"
      @update:model-value="goalWeightLb = toNumberOrNull($event)"
    />
    <q-input
      v-else
      :model-value="goalWeight"
      type="number"
      label="Goal Weight (kg)"
      filled
      class="q-mb-sm"
      @update:model-value="emit('update:goalWeight', toNumberOrNull($event))"
    />
    <template v-if="isImperial">
      <div class="row q-col-gutter-sm q-mb-sm">
        <div class="col-6">
          <q-input
            :model-value="heightFeet"
            type="number"
            label="Height (ft)"
            filled
            step="1"
            @update:model-value="onHeightFeetInput($event)"
          />
        </div>
        <div class="col-6">
          <q-input
            :model-value="heightInches"
            type="number"
            label="Height (in)"
            filled
            step="1"
            @update:model-value="onHeightInchesInput($event)"
          />
        </div>
      </div>
    </template>
    <q-input
      v-else
      :model-value="height"
      type="number"
      label="Height (cm)"
      filled
      class="q-mb-sm"
      @update:model-value="emit('update:height', toNumberOrNull($event))"
    />
  </template>
  <template v-if="showRateFields">
    <q-select
      :model-value="weeklyRate"
      :options="goalAwareRateOptions"
      :label="`Goal Rate (${rateUnitLabel})`"
      filled
      emit-value
      map-options
      @update:model-value="emit('update:weeklyRate', $event)"
    />
    <q-input
      v-if="weeklyRate === 'custom'"
      :model-value="customRateDisplay"
      type="number"
      :label="`Custom Rate (${rateUnitLabel})`"
      filled
      class="q-mt-sm"
      hint="Negative for loss, positive for gain"
      @update:model-value="customRateDisplay = toNumberOrNull($event)"
    />
    <q-banner
      v-if="goalRateWarning"
      dense
      rounded
      class="q-mt-sm goal-rate-warning"
      :class="goalRateWarning.level === 'strong' ? 'goal-rate-warning--strong' : 'goal-rate-warning--mild'"
      role="status"
    >
      {{ goalRateWarning.message }}
    </q-banner>
  </template>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { cmToFtIn, convertWeeklyRateKg, ftInToCm, kgToLb, lbToKg } from '../../utils/bodyUnits'

const props = defineProps({
  startWeight: { type: Number, default: null },
  goalWeight: { type: Number, default: null },
  height: { type: Number, default: null },
  weeklyRate: { type: [Number, String], default: null },
  customRate: { type: Number, default: null },
  bodyWeightForRate: { type: Number, default: null },
  profileMeasurementSystem: { type: String, default: 'metric' },
  profileMeasurementSystemOptions: { type: Array, default: () => ([{ label: 'Metric', value: 'metric' }, { label: 'Imperial', value: 'imperial' }]) },
  rateOptions: { type: Array, required: true },
  showProfileFields: { type: Boolean, default: true },
  showRateFields: { type: Boolean, default: true }
})

const emit = defineEmits([
  'update:startWeight',
  'update:goalWeight',
  'update:height',
  'update:weeklyRate',
  'update:customRate',
  'update:profileMeasurementSystem'
])

const isImperial = computed(() => props.profileMeasurementSystem === 'imperial')
const rateUnitLabel = computed(() => isImperial.value ? 'lb/week' : 'kg/week')

const heightFeet = ref(null)
const heightInches = ref(null)
const isSyncingImperialHeight = ref(false)
const hasImperialHeightUserEdits = ref(false)

watch([() => props.height, isImperial], ([value, imperial]) => {
  if (!imperial) return
  const converted = cmToFtIn(value)
  let feet = Number.isFinite(converted.feet) ? converted.feet : null
  let inches = Number.isFinite(converted.inches) ? Math.round(converted.inches) : null
  if (Number.isFinite(feet) && Number.isFinite(inches) && inches >= 12) {
    feet += Math.floor(inches / 12)
    inches = inches % 12
  }
  isSyncingImperialHeight.value = true
  hasImperialHeightUserEdits.value = false
  heightFeet.value = feet
  heightInches.value = inches
  isSyncingImperialHeight.value = false
}, { immediate: true })

watch([heightFeet, heightInches], ([feet, inches]) => {
  if (!isImperial.value) return
  if (isSyncingImperialHeight.value) return
  if (!hasImperialHeightUserEdits.value) return
  emit('update:height', toNumberOrNull(ftInToCm(feet, inches)))
})

function onHeightFeetInput(value) {
  hasImperialHeightUserEdits.value = true
  heightFeet.value = toIntegerOrNull(value)
}

function onHeightInchesInput(value) {
  hasImperialHeightUserEdits.value = true
  heightInches.value = toIntegerOrNull(value)
}

const startWeightLb = computed({
  get: () => {
    const lb = kgToLb(props.startWeight)
    return Number.isFinite(lb) ? Math.round(lb * 10) / 10 : null
  },
  set: (value) => emit('update:startWeight', toNumberOrNull(lbToKg(value)))
})

const goalWeightLb = computed({
  get: () => {
    const lb = kgToLb(props.goalWeight)
    return Number.isFinite(lb) ? Math.round(lb * 10) / 10 : null
  },
  set: (value) => emit('update:goalWeight', toNumberOrNull(lbToKg(value)))
})

const customRateDisplay = computed({
  get: () => {
    const converted = convertWeeklyRateKg(props.customRate, props.profileMeasurementSystem)
    return Number.isFinite(converted) ? Math.round(converted * 100) / 100 : null
  },
  set: (value) => {
    if (props.profileMeasurementSystem === 'imperial') {
      emit('update:customRate', toNumberOrNull(lbToKg(value)))
      return
    }
    emit('update:customRate', toNumberOrNull(value))
  }
})

function toNumberOrNull(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toIntegerOrNull(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.round(numeric) : null
}

const goalAwareRateOptions = computed(() => {
  const start = Number(props.startWeight)
  const goal = Number(props.goalWeight)
  const hasGoalDirection = Number.isFinite(start) && Number.isFinite(goal)
  const direction = hasGoalDirection
    ? (goal < start ? 'loss' : (goal > start ? 'gain' : 'maintain'))
    : null

  return props.rateOptions.map(option => {
    const base = { ...option }
    if (base.value !== 'custom') {
      const converted = convertWeeklyRateKg(base.value, props.profileMeasurementSystem)
      if (Number.isFinite(converted)) {
        const prefix = converted > 0 ? '+' : ''
        base.label = converted === 0 ? 'Maintain' : `${prefix}${converted.toFixed(2)} ${rateUnitLabel.value}`
      }
    }
    if (option.value === 'custom') return base
    const value = Number(option.value)
    if (!Number.isFinite(value) || !hasGoalDirection) return base

    if (direction === 'loss' && value >= 0) return { ...base, disable: true }
    if (direction === 'gain' && value <= 0) return { ...base, disable: true }
    if (direction === 'maintain' && value !== 0) return { ...base, disable: true }
    return base
  })
})

const goalDirection = computed(() => {
  const start = Number(props.startWeight)
  const goal = Number(props.goalWeight)
  if (!Number.isFinite(start) || !Number.isFinite(goal)) return null
  if (goal < start) return 'loss'
  if (goal > start) return 'gain'
  return 'maintain'
})

function defaultRateForDirection(direction) {
  if (direction === 'loss') return -0.5
  if (direction === 'gain') return 0.5
  if (direction === 'maintain') return 0
  return null
}

function isRateAllowedForDirection(value, direction) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return false
  if (direction === 'loss') return numeric < 0
  if (direction === 'gain') return numeric > 0
  if (direction === 'maintain') return numeric === 0
  return true
}

const goalRateWarning = computed(() => {
  const weeklyRate = props.weeklyRate === 'custom'
    ? Number(props.customRate)
    : Number(props.weeklyRate)
  const bodyWeightCandidate = Number(props.bodyWeightForRate)
  const fallbackStartWeight = Number(props.startWeight)
  const bodyWeight = Number.isFinite(bodyWeightCandidate) && bodyWeightCandidate > 0
    ? bodyWeightCandidate
    : fallbackStartWeight
  if (!Number.isFinite(weeklyRate) || !Number.isFinite(bodyWeight) || bodyWeight <= 0) return null

  const kgPerWeek = Math.abs(weeklyRate)
  const ratePercent = (kgPerWeek / bodyWeight) * 100
  const displayRate = convertWeeklyRateKg(kgPerWeek, props.profileMeasurementSystem)
  const prettyRate = ratePercent.toFixed(2)
  const prettyAbsRate = Number.isFinite(displayRate) ? displayRate.toFixed(2) : kgPerWeek.toFixed(2)

  if (ratePercent > 1.5) {
    return {
      level: 'strong',
      message: `Your selected goal changes body weight very rapidly at about ${prettyRate}% or ${prettyAbsRate} ${rateUnitLabel.value}. This may be unsafe without professional supervision.`
    }
  }

  if (ratePercent > 1.0 || kgPerWeek > 0.5) {
    return {
      level: 'mild',
      message: `Your selected goal changes body weight rapidly at about ${prettyRate}% or ${prettyAbsRate} ${rateUnitLabel.value}. Consider reviewing this goal with a qualified health professional.`
    }
  }

  return null
})

watch([goalDirection, () => props.weeklyRate], ([direction, currentRate]) => {
  if (!direction) return
  if (currentRate === 'custom') {
    return
  }
  if (!isRateAllowedForDirection(currentRate, direction)) {
    emit('update:weeklyRate', defaultRateForDirection(direction))
  }
}, { immediate: true })
</script>

<style scoped>
.goal-rate-warning {
  border: 1px solid transparent;
}

.goal-rate-warning--mild {
  background: #fff8db;
  border-color: #e3bd44;
  color: #5e4200;
}

.goal-rate-warning--strong {
  background: #ffe6e6;
  border-color: #d93f3f;
  color: #7f1d1d;
}
</style>
