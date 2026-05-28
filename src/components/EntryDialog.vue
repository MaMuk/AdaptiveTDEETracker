<template>
  <QDialog
    v-model="open"
    maximized
    position="top"
    persistent
  >
    <q-card class="entry-dialog-card">
      <q-card-section class="row items-center justify-between q-pb-sm">
        <div class="text-h6">
          {{ resolvedTitle }}
        </div>
        <q-chip
          dense
          :color="isDraftDirty ? 'orange-6' : 'positive'"
          text-color="white"
          icon="save"
        >
          {{ isDraftDirty ? 'Unsaved' : 'Saved' }}
        </q-chip>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-md-8">
            <div class="name-field-wrap">
              <q-input
                v-model="draft.name"
                dense
                filled
                label="Name"
                @update:model-value="showNameSuggestions = true"
                @focus="showNameSuggestions = true"
                @blur="onNameFieldBlur"
              />
              <q-list
                v-if="showNameSuggestions && nameSuggestionMatches.length > 0"
                bordered
                separator
                class="name-suggestion-list"
              >
                <q-item
                  v-for="option in nameSuggestionMatches"
                  :key="option.id"
                  clickable
                  @mousedown.prevent
                  @click="chooseNameSuggestion(option)"
                >
                  <q-item-section>
                    <q-item-label>{{ option.name }}</q-item-label>
                    <q-item-label caption>
                      {{ option.amount || 'No amount' }} · {{ option.calories }} kcal
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>

          <div
            v-if="showSectionSelect"
            class="col-12 col-md-4"
          >
            <q-select
              v-model="draft.section"
              dense
              filled
              emit-value
              map-options
              label="Section"
              :options="sections"
            />
          </div>

          <div class="col-12">
            <div class="text-caption text-grey-7 q-mb-xs">
              Log by
            </div>
            <q-btn-toggle
              v-model="logMode"
              unelevated
              toggle-color="primary"
              color="grey-3"
              text-color="dark"
              spread
              :options="logModeOptions"
            />
          </div>

          <template v-if="logMode === 'measured'">
            <div class="col-7 col-sm-6">
              <q-input
                v-model="measuredAmount"
                dense
                filled
                label="Measured"
                inputmode="decimal"
                @update:model-value="sanitizeMeasuredInput"
              />
            </div>

            <div class="col-5 col-sm-6">
              <q-select
                v-model="measuredUnit"
                dense
                filled
                emit-value
                map-options
                label="Unit"
                :options="unitOptions"
              />
            </div>

            <div class="col-12">
              <q-input
                v-model.number="measuredEnergy"
                dense
                filled
                type="number"
                min="0"
                step="1"
                label="Energy density"
              >
                <template #append>
                  <span class="text-caption text-grey-7">{{ energySuffix }}</span>
                </template>
              </q-input>
            </div>
          </template>

          <div
            v-if="logMode === 'calories'"
            class="col-12"
          >
            <q-input
              v-model.number="caloriesDirect"
              dense
              filled
              type="number"
              min="0"
              step="1"
              label="Calories"
              suffix="kcal"
            />
          </div>

          <div
            v-if="showMetadataFields"
            class="col-12"
          >
            <q-input
              v-model="draft.tagsCsv"
              dense
              filled
              label="Tags"
              placeholder="protein, breakfast"
            />
          </div>

          <div
            v-if="showMetadataFields"
            class="col-12"
          >
            <q-input
              v-model="draft.notes"
              dense
              filled
              type="textarea"
              autogrow
              label="Notes"
            />
          </div>

          <div class="col-12">
            <div class="text-caption text-grey-7">
              Total
            </div>
            <div class="text-subtitle2">
              {{ computedTotalCalories }} kcal
            </div>
          </div>

          <div
            v-if="enableSuggestionPicker"
            class="col-12"
          >
            <q-btn
              dense
              flat
              color="dark"
              icon="history"
              label="Open Suggestion Picker"
              @click="$emit('open-suggestion-picker', draft.section)"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          label="Revert"
          :disable="!isDraftDirty"
          @click="revertDraft"
        />
        <q-btn
          flat
          label="Cancel"
          @click="close"
        />
        <q-btn
          color="primary"
          unelevated
          :label="saveLabel"
          @click="save"
        />
      </q-card-actions>
    </q-card>
  </QDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { QDialog, useQuasar } from 'quasar'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  entry: { type: Object, default: null },
  defaultSection: { type: String, default: '' },
  sections: { type: Array, default: () => [] },
  suggestions: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  saveLabel: { type: String, default: 'Save' },
  enableSuggestionPicker: { type: Boolean, default: true },
  showMetadataFields: { type: Boolean, default: false },
  measurementUnits: { type: Array, default: () => ['g', 'ml', 'serving'] },
  measurementUnitMultipliers: { type: Object, default: () => ({ g: 100, ml: 100, serving: 1 }) }
})

const emit = defineEmits(['update:modelValue', 'save', 'open-suggestion-picker'])
const $q = useQuasar()

const logModeOptions = [
  { label: 'Measured', value: 'measured' },
  { label: 'Calories', value: 'calories' }
]

const draft = ref(defaultDraft())
const initialDraft = ref(defaultDraft())
const showNameSuggestions = ref(false)
const logMode = ref('calories')
const measuredAmount = ref('')
const measuredUnit = ref('g')
const measuredEnergy = ref(null)
const caloriesDirect = ref(null)

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const resolvedTitle = computed(() => {
  if (props.title) return props.title
  return draft.value.id ? 'Edit Entry' : 'New Entry'
})

const showSectionSelect = computed(() => Array.isArray(props.sections) && props.sections.length > 0)

const unitOptions = computed(() => {
  const list = Array.isArray(props.measurementUnits) ? props.measurementUnits : []
  const normalized = [...new Set(list.map(unit => String(unit || '').trim().toLowerCase()).filter(Boolean))]
  const fallback = ['g', 'ml', 'serving']
  const finalList = normalized.length > 0 ? normalized : fallback
  return finalList.map(unit => ({ label: unit, value: unit }))
})

const energySuffix = computed(() => {
  const multiplier = unitMultiplier.value
  if (multiplier === 100) return `kcal/100${measuredUnit.value}`
  if (multiplier === 1) return `kcal/${measuredUnit.value}`
  return `kcal/${multiplier}${measuredUnit.value}`
})

const unitMultiplier = computed(() => {
  const fromConfig = Number(props.measurementUnitMultipliers?.[measuredUnit.value])
  if (Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig
  // Backward fallback for legacy setups without explicit multipliers.
  if (['g', 'ml', 'oz', 'fl oz'].includes(measuredUnit.value)) return 100
  return 1
})

const nameSuggestionMatches = computed(() => {
  const query = String(draft.value.name || '').trim().toLowerCase()
  return props.suggestions
    .filter(item => String(item?.name || '').trim().length > 0)
    .filter(item => !query || String(item.name || '').toLowerCase().includes(query))
    .filter((item, index, arr) => arr.findIndex(other => String(other.name || '').toLowerCase() === String(item.name || '').toLowerCase()) === index)
    .slice(0, 8)
})

const computedTotalCalories = computed(() => {
  if (logMode.value === 'measured') {
    const amount = Number(measuredAmount.value)
    const energy = Number(measuredEnergy.value)
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(energy) || energy < 0) return 0
    return Math.round((amount * energy) / unitMultiplier.value)
  }
  const direct = Number(caloriesDirect.value)
  return Number.isFinite(direct) && direct >= 0 ? Math.round(direct) : 0
})

const isDraftDirty = computed(() => {
  return JSON.stringify(draft.value) !== JSON.stringify(initialDraft.value)
    || logMode.value !== resolveMode(initialDraft.value)
    || measuredAmount.value !== parseMeasuredAmount(initialDraft.value).amount
    || measuredUnit.value !== parseMeasuredAmount(initialDraft.value).unit
})

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) return
  initializeDraft(props.entry, props.defaultSection)
})

function defaultDraft() {
  return {
    id: null,
    name: '',
    amount: '',
    calories: 0,
    section: '',
    usePer100g: false,
    caloriesPer100g: null,
    notes: '',
    tagsCsv: ''
  }
}

function parseMeasuredAmount(item) {
  const raw = String(item?.amount || '').trim().replace(',', '.')
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(.+)$/)
  if (match) {
    return {
      amount: match[1],
      unit: String(match[2] || '').trim().toLowerCase()
    }
  }
  return { amount: '', unit: '' }
}

function hasServingMetadata(item) {
  const parsed = parseMeasuredAmount(item)
  return parsed.unit.startsWith('serv')
}

function resolveMode(item) {
  if (!item) return 'calories'
  if (Boolean(item.usePer100g) || Number.isFinite(Number(item.caloriesPer100g)) || hasServingMetadata(item)) return 'measured'
  return 'calories'
}

function initializeDraft(entry, defaultSection) {
  const source = entry ? {
    id: entry.id || null,
    name: entry.name || '',
    amount: entry.amount || '',
    calories: Number(entry.calories) || 0,
    section: entry.section || defaultSection || '',
    usePer100g: Boolean(entry.usePer100g),
    caloriesPer100g: entry.caloriesPer100g ?? null,
    notes: String(entry.notes || ''),
    tagsCsv: String(entry.tagsCsv || (Array.isArray(entry.tags) ? entry.tags.join(', ') : ''))
  } : {
    ...defaultDraft(),
    section: defaultSection || ''
  }

  draft.value = source
  initialDraft.value = { ...source }
  logMode.value = resolveMode(source)

  const parsedMeasured = parseMeasuredAmount(source)
  measuredAmount.value = parsedMeasured.amount
  const availableUnits = unitOptions.value.map(option => option.value)
  measuredUnit.value = availableUnits.includes(parsedMeasured.unit)
    ? parsedMeasured.unit
    : availableUnits[0]

  if (source.usePer100g) {
    measuredEnergy.value = Number.isFinite(Number(source.caloriesPer100g)) ? Number(source.caloriesPer100g) : null
  } else if (parsedMeasured.amount && hasServingMetadata(source)) {
    const numericAmount = Number(parsedMeasured.amount)
    measuredEnergy.value = Number.isFinite(numericAmount) && numericAmount > 0
      ? Math.round((Number(source.calories) || 0) / numericAmount)
      : null
  } else {
    measuredEnergy.value = null
  }

  caloriesDirect.value = Number(source.calories) || 0
  showNameSuggestions.value = false
}

function sanitizeMeasuredInput(value) {
  let next = String(value || '').replace(',', '.').replace(/[^\d.]/g, '')
  const dotIndex = next.indexOf('.')
  if (dotIndex !== -1) {
    next = next.slice(0, dotIndex + 1) + next.slice(dotIndex + 1).replace(/\./g, '')
  }
  measuredAmount.value = next
}

function onNameFieldBlur() {
  draft.value.name = String(draft.value.name || '').trim()
  setTimeout(() => {
    showNameSuggestions.value = false
  }, 120)
}

function chooseNameSuggestion(suggestion) {
  applySuggestion(suggestion)
  showNameSuggestions.value = false
}

function applySuggestion(suggestion) {
  const suggestedMode = resolveMode(suggestion)
  logMode.value = suggestedMode
  draft.value = {
    ...draft.value,
    name: String(suggestion.name || '').trim(),
    amount: suggestion.amount || '',
    calories: Number(suggestion.calories) || 0,
    usePer100g: Boolean(suggestion.usePer100g),
    caloriesPer100g: suggestion.caloriesPer100g ?? null,
    notes: String(suggestion.notes || ''),
    tagsCsv: String(suggestion.tagsCsv || (Array.isArray(suggestion.tags) ? suggestion.tags.join(', ') : '')),
    section: draft.value.section || props.defaultSection || ''
  }

  const parsedMeasured = parseMeasuredAmount(suggestion)
  measuredAmount.value = parsedMeasured.amount
  if (parsedMeasured.unit && unitOptions.value.some(option => option.value === parsedMeasured.unit)) {
    measuredUnit.value = parsedMeasured.unit
  }
  if (suggestion.usePer100g) {
    measuredEnergy.value = Number.isFinite(Number(suggestion.caloriesPer100g)) ? Number(suggestion.caloriesPer100g) : null
  } else if (hasServingMetadata(suggestion) && Number(suggestion.calories) > 0 && Number(parsedMeasured.amount) > 0) {
    measuredEnergy.value = Math.round(Number(suggestion.calories) / Number(parsedMeasured.amount))
  } else {
    measuredEnergy.value = null
  }
  caloriesDirect.value = Number(suggestion.calories) || 0
}

function validateDraft() {
  const name = String(draft.value.name || '').trim()
  if (!name) {
    $q.notify({ type: 'negative', message: 'Name is required.' })
    return false
  }

  if (logMode.value === 'measured') {
    const amount = Number(measuredAmount.value)
    const energy = Number(measuredEnergy.value)
    if (!Number.isFinite(amount) || amount < 0) {
      $q.notify({ type: 'negative', message: 'Measured value must be a valid non-negative number.' })
      return false
    }
    if (!Number.isFinite(energy) || energy < 0) {
      $q.notify({ type: 'negative', message: 'Energy density must be a valid non-negative number.' })
      return false
    }
  }

  if (logMode.value === 'calories') {
    const calories = Number(caloriesDirect.value)
    if (!Number.isFinite(calories) || calories < 0) {
      $q.notify({ type: 'negative', message: 'Calories must be a valid non-negative number.' })
      return false
    }
  }

  return true
}

function toPayload() {
  const base = {
    id: draft.value.id,
    name: String(draft.value.name || '').trim(),
    section: draft.value.section || '',
    notes: String(draft.value.notes || '').trim(),
    tagsCsv: String(draft.value.tagsCsv || '').trim()
  }

  if (logMode.value === 'measured') {
    const isPer100Unit = Number(unitMultiplier.value) === 100
    return {
      ...base,
      amount: `${Number(measuredAmount.value)} ${measuredUnit.value}`,
      calories: computedTotalCalories.value,
      usePer100g: isPer100Unit,
      caloriesPer100g: isPer100Unit ? Number(measuredEnergy.value) : null
    }
  }

  return {
    ...base,
    amount: String(draft.value.amount || '').trim(),
    calories: computedTotalCalories.value,
    usePer100g: false,
    caloriesPer100g: null
  }
}

function save() {
  if (!validateDraft()) return
  emit('save', toPayload())
  initialDraft.value = { ...draft.value }
  open.value = false
}

function close() {
  open.value = false
}

function revertDraft() {
  initializeDraft(initialDraft.value, props.defaultSection)
}

defineExpose({ applySuggestion })
</script>

<style scoped>
.entry-dialog-card {
  width: 100%;
  min-height: 100vh;
  border-radius: 0;
}

.name-field-wrap {
  position: relative;
}

.name-suggestion-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 25;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
}
</style>
