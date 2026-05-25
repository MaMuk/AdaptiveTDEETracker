<template>
  <template v-if="showProfileFields">
    <q-input
      :model-value="startWeight"
      type="number"
      label="Starting Weight (kg)"
      filled
      class="q-mb-sm"
      @update:model-value="emit('update:startWeight', toNumberOrNull($event))"
    />
    <q-input
      :model-value="goalWeight"
      type="number"
      label="Goal Weight (kg)"
      filled
      class="q-mb-sm"
      @update:model-value="emit('update:goalWeight', toNumberOrNull($event))"
    />
    <q-input
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
      label="Goal Rate (kg/week)"
      filled
      emit-value
      map-options
      @update:model-value="emit('update:weeklyRate', $event)"
    />
    <q-input
      v-if="weeklyRate === 'custom'"
      :model-value="customRate"
      type="number"
      label="Custom Rate (kg/week)"
      filled
      class="q-mt-sm"
      hint="Negative for loss, positive for gain"
      @update:model-value="emit('update:customRate', toNumberOrNull($event))"
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
import { computed, watch } from 'vue'

const props = defineProps({
  startWeight: { type: Number, default: null },
  goalWeight: { type: Number, default: null },
  height: { type: Number, default: null },
  weeklyRate: { type: [Number, String], default: null },
  customRate: { type: Number, default: null },
  bodyWeightForRate: { type: Number, default: null },
  rateOptions: { type: Array, required: true },
  showProfileFields: { type: Boolean, default: true },
  showRateFields: { type: Boolean, default: true }
})

const emit = defineEmits([
  'update:startWeight',
  'update:goalWeight',
  'update:height',
  'update:weeklyRate',
  'update:customRate'
])

function toNumberOrNull(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const goalAwareRateOptions = computed(() => {
  const start = Number(props.startWeight)
  const goal = Number(props.goalWeight)
  const hasGoalDirection = Number.isFinite(start) && Number.isFinite(goal)
  const direction = hasGoalDirection
    ? (goal < start ? 'loss' : (goal > start ? 'gain' : 'maintain'))
    : null

  return props.rateOptions.map(option => {
    if (option.value === 'custom') return option
    const value = Number(option.value)
    if (!Number.isFinite(value) || !hasGoalDirection) return option

    if (direction === 'loss' && value >= 0) return { ...option, disable: true }
    if (direction === 'gain' && value <= 0) return { ...option, disable: true }
    if (direction === 'maintain' && value !== 0) return { ...option, disable: true }
    return option
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
  const prettyRate = ratePercent.toFixed(2)
  const prettyKg = kgPerWeek.toFixed(2)

  if (ratePercent > 1.5) {
    return {
      level: 'strong',
      message: `Your selected goal changes body weight very rapidly at about ${prettyRate}% or ${prettyKg} kg per week. This may be unsafe without professional supervision.`
    }
  }

  if (ratePercent > 1.0 || kgPerWeek > 0.5) {
    return {
      level: 'mild',
      message: `Your selected goal changes body weight rapidly at about ${prettyRate}% or ${prettyKg} kg per week. Consider reviewing this goal with a qualified health professional.`
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
