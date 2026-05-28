<template>
  <div class="text-caption q-mb-sm">
    {{ description }}
  </div>
  <q-toggle
    :model-value="enabled"
    :label="toggleLabel"
    color="primary"
    @update:model-value="emit('update:enabled', Boolean($event))"
  />
  <q-input
    v-if="enabled"
    :model-value="sectionsText"
    type="text"
    label="Sections (comma separated)"
    filled
    class="q-mt-sm"
    hint="Example: Breakfast, Lunch, Dinner, Snacks"
    @update:model-value="emit('update:sectionsText', String($event || ''))"
  />
  <div
    v-if="enabled"
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
        :model-value="sectionPercentages[field.key]"
        type="number"
        min="0"
        step="1"
        :label="`${field.label} (%)`"
        filled
        @update:model-value="emit('update:sectionPercentage', { key: field.key, value: toNumberOrZero($event) })"
      />
    </div>
    <div
      class="text-caption"
      :class="totalSectionPercentage === 100 ? 'text-positive' : 'text-warning'"
    >
      Total: {{ totalSectionPercentage }}%
    </div>

    <div class="q-mt-md">
      <div class="text-caption text-grey-7 q-mb-xs">
        Measurement system
      </div>
      <q-btn-toggle
        :model-value="measurementSystem"
        spread
        unelevated
        color="grey-3"
        text-color="dark"
        toggle-color="primary"
        :options="measurementSystemOptions"
        @update:model-value="emit('update:measurementSystem', $event)"
      />
    </div>

    <q-select
      :model-value="measurementUnits"
      class="q-mt-sm"
      filled
      label="Supported measured units"
      hint="Preset seeds common units. You can enable any supported unit."
      use-chips
      multiple
      emit-value
      map-options
      :options="unitOptions"
      @update:model-value="emit('update:measurementUnits', Array.isArray($event) ? $event : [])"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { listEnabledUnits } from '../../utils/unitLibrary'

defineProps({
  enabled: { type: Boolean, default: false },
  sectionsText: { type: String, default: 'Breakfast, Lunch, Dinner, Snacks' },
  sectionPercentageFields: { type: Array, required: true },
  sectionPercentages: { type: Object, required: true },
  totalSectionPercentage: { type: Number, required: true },
  description: { type: String, default: 'Optional offline diary that can fill calories into the daily log when you choose.' },
  toggleLabel: { type: String, default: 'Enable Food Diary' },
  measurementSystem: { type: String, default: 'metric' },
  measurementUnits: { type: Array, default: () => ['g', 'ml', 'serving'] },
  measurementSystemOptions: {
    type: Array,
    default: () => ([
      { label: 'Metric', value: 'metric' },
      { label: 'Imperial', value: 'imperial' }
    ])
  }
})

const emit = defineEmits([
  'update:enabled',
  'update:sectionsText',
  'update:sectionPercentage',
  'update:measurementSystem',
  'update:measurementUnits'
])

function toNumberOrZero(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

const unitOptions = computed(() => listEnabledUnits().map((unit) => ({
  label: `${unit.label} (${unit.category})`,
  value: unit.id
})))
</script>
