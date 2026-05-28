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

    <q-input
      :model-value="measurementUnitsText"
      class="q-mt-sm"
      filled
      label="Measured units (comma separated)"
      hint="Used for Measured entry mode in Diary and Suggestions."
      @update:model-value="emit('update:measurementUnitsText', String($event || ''))"
    />

    <q-input
      :model-value="measurementMultipliersText"
      class="q-mt-sm"
      filled
      label="Unit multipliers (unit:value)"
      hint="Example: g:100, ml:100, serving:1"
      @update:model-value="emit('update:measurementMultipliersText', String($event || ''))"
    />
  </div>
</template>

<script setup>
defineProps({
  enabled: { type: Boolean, default: false },
  sectionsText: { type: String, default: 'Breakfast, Lunch, Dinner, Snacks' },
  sectionPercentageFields: { type: Array, required: true },
  sectionPercentages: { type: Object, required: true },
  totalSectionPercentage: { type: Number, required: true },
  description: { type: String, default: 'Optional offline diary that can fill calories into the daily log when you choose.' },
  toggleLabel: { type: String, default: 'Enable Food Diary' },
  measurementSystem: { type: String, default: 'metric' },
  measurementUnitsText: { type: String, default: 'g, ml, serving' },
  measurementMultipliersText: { type: String, default: 'g:100, ml:100, serving:1' },
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
  'update:measurementUnitsText',
  'update:measurementMultipliersText'
])

function toNumberOrZero(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}
</script>
