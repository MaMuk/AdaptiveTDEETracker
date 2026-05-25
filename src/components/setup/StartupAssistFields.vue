<template>
  <div class="text-caption q-mb-sm">
    {{ caption }}
  </div>
  <q-toggle
    v-if="showEnableToggle"
    :model-value="enabled"
    :label="enableLabel"
    color="primary"
    class="q-mt-xs"
    @update:model-value="emit('update:enabled', Boolean($event))"
  />
  <template v-if="enabled || !showEnableToggle">
    <q-select
      :model-value="activityLevel"
      :options="activityLevelOptions"
      label="Activity level"
      filled
      emit-value
      map-options
      class="q-mt-sm"
      @update:model-value="emit('update:activityLevel', $event)"
    />
    <q-input
      :model-value="age"
      type="number"
      label="Age (years)"
      filled
      class="q-mt-sm"
      @update:model-value="emit('update:age', toNumberOrNull($event))"
    />
    <q-select
      :model-value="sex"
      :options="sexOptions"
      label="Sex"
      filled
      emit-value
      map-options
      class="q-mt-sm"
      @update:model-value="emit('update:sex', $event)"
    />
    <q-banner
      v-if="showBanner"
      rounded
      class="bg-blue-1 text-primary q-mt-sm"
    >
      Uses your profile and activity level to estimate maintenance calories and blends it with your log-based maintenance during startup. Set blend to 0 for log-only or 1 for activity-only.
    </q-banner>
    <div class="text-caption q-mt-md">
      Startup blend (0 = log-based only, 1 = activity-based only)
    </div>
    <q-slider
      :model-value="tdeeManualBias"
      :min="0"
      :max="1"
      :step="0.01"
      label
      label-always
      class="q-mt-sm"
      @update:model-value="emit('update:tdeeManualBias', Number($event))"
    />
  </template>
</template>

<script setup>
defineProps({
  enabled: { type: Boolean, default: false },
  activityLevel: { type: String, default: 'low' },
  age: { type: Number, default: null },
  sex: { type: String, default: 'male' },
  tdeeManualBias: { type: Number, default: 0 },
  activityLevelOptions: { type: Array, required: true },
  sexOptions: { type: Array, required: true },
  showEnableToggle: { type: Boolean, default: true },
  showBanner: { type: Boolean, default: true },
  caption: { type: String, default: 'Startup activity assist (optional)' },
  enableLabel: { type: String, default: 'Use activity-based startup baseline' }
})

const emit = defineEmits([
  'update:enabled',
  'update:activityLevel',
  'update:age',
  'update:sex',
  'update:tdeeManualBias'
])

function toNumberOrNull(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}
</script>
