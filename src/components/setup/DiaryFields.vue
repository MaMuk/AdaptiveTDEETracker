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
  toggleLabel: { type: String, default: 'Enable Food Diary' }
})

const emit = defineEmits([
  'update:enabled',
  'update:sectionsText',
  'update:sectionPercentage'
])

function toNumberOrZero(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}
</script>
