<template>
  <QDialog
    v-model="open"
    maximized
    position="top"
    persistent
  >
    <q-card
      class="entry-dialog-card"
      data-tour="entry-dialog"
    >
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
                data-tour="entry-dialog-name"
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

          <div
            class="col-12"
            data-tour="entry-dialog-log-mode"
          >
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
            <div
              class="col-7 col-sm-6"
              data-tour="entry-dialog-measured-amount"
            >
              <q-input
                v-model="measuredAmount"
                dense
                filled
                label="Measured"
                inputmode="decimal"
                @update:model-value="sanitizeMeasuredInput"
              />
            </div>

            <div
              class="col-5 col-sm-6"
              data-tour="entry-dialog-measured-unit"
            >
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

            <div
              class="col-12"
              data-tour="entry-dialog-energy-density"
            >
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
            data-tour="entry-dialog-calories"
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

          <template v-if="showMacroFields">
            <div
              class="col-12 col-sm-4"
              data-tour="entry-dialog-protein"
            >
              <q-input
                v-model.number="proteinInput"
                dense
                filled
                type="number"
                min="0"
                step="0.1"
                label="Protein"
                :suffix="macroInputSuffix"
              />
            </div>
            <div
              class="col-12 col-sm-4"
              data-tour="entry-dialog-carbohydrates"
            >
              <q-input
                v-model.number="carbohydratesInput"
                dense
                filled
                type="number"
                min="0"
                step="0.1"
                label="Carbohydrates"
                :suffix="macroInputSuffix"
              />
            </div>
            <div
              class="col-12 col-sm-4"
              data-tour="entry-dialog-fat"
            >
              <q-input
                v-model.number="fatInput"
                dense
                filled
                type="number"
                min="0"
                step="0.1"
                label="Fat"
                :suffix="macroInputSuffix"
              />
            </div>
          </template>

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
            <div
              class="nutrition-summary"
              data-tour="entry-dialog-summary"
            >
              <div class="nutrition-title">
                Nutrition Summary
              </div>
              <div class="nutrition-rule nutrition-rule-thick" />
              <div class="nutrition-row nutrition-row-main">
                <span>Calories</span>
                <strong>{{ computedTotalCalories }} kcal</strong>
              </div>
              <div class="nutrition-rule nutrition-rule-medium" />
              <div class="nutrition-row">
                <span>Protein</span>
                <span>{{ formatMacroForSummary(computedTotalProtein) }}</span>
              </div>
              <div class="nutrition-row">
                <span>Carbohydrates</span>
                <span>{{ formatMacroForSummary(computedTotalCarbohydrates) }}</span>
              </div>
              <div class="nutrition-row">
                <span>Fat</span>
                <span>{{ formatMacroForSummary(computedTotalFat) }}</span>
              </div>
              <div class="nutrition-rule nutrition-rule-thick" />
            </div>
          </div>

          <div class="col-12">
            <div class="row q-gutter-sm">
              <q-btn
                v-if="enableSuggestionPicker"
                dense
                flat
                color="dark"
                icon="history"
                label="Open Suggestion Picker"
                @click="$emit('open-suggestion-picker', draft.section)"
              />
              <q-btn
                v-if="aiRecognitionEnabled"
                class="ai-magic-btn"
                data-tour="entry-dialog-ai"
                dense
                unelevated
                icon="auto_awesome"
                :label="aiRecognitionLabel"
                @click="$emit('open-ai-recognition', draft.section)"
              />
            </div>
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
          data-tour="entry-dialog-cancel"
          label="Cancel"
          @click="close"
        />
        <q-btn
          color="primary"
          unelevated
          data-tour="entry-dialog-save"
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
import { convertAmountBetweenUnits, formatUnitLabel, getCanonicalDensitySuffixFromBasis, getUnitById, resolveUnitId } from '../utils/unitLibrary'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  entry: { type: Object, default: null },
  defaultSection: { type: String, default: '' },
  sections: { type: Array, default: () => [] },
  suggestions: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  saveLabel: { type: String, default: 'Save' },
  enableSuggestionPicker: { type: Boolean, default: true },
  aiRecognitionEnabled: { type: Boolean, default: false },
  aiRecognitionLabel: { type: String, default: 'Recognize with AI' },
  showMetadataFields: { type: Boolean, default: false },
  showMacroFields: { type: Boolean, default: false },
  measurementUnits: { type: Array, default: () => ['g', 'ml', 'serving'] },
  measurementUnitMultipliers: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue', 'save', 'open-suggestion-picker', 'open-ai-recognition'])
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
const proteinInput = ref(null)
const carbohydratesInput = ref(null)
const fatInput = ref(null)

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
  const normalized = [...new Set(list.map(resolveUnitId).filter(Boolean))]
  const fallback = ['g', 'ml', 'serving']
  const finalList = normalized.length > 0 ? normalized : fallback
  return finalList.map(unit => ({ label: formatUnitLabel(unit), value: unit }))
})

const densityBasisFromUnit = computed(() => (getUnitById(measuredUnit.value)?.category === 'volume' ? 'volume' : 'mass'))
const selectedUnitCategory = computed(() => getUnitById(measuredUnit.value)?.category || 'mass')
const selectedUnit = computed(() => getUnitById(measuredUnit.value))
const isCanonicalDensityInputUnit = computed(() => measuredUnit.value === 'g' || measuredUnit.value === 'ml')
const energySuffix = computed(() => {
  if (selectedUnitCategory.value === 'portion') return `kcal/${formatUnitLabel(measuredUnit.value)}`
  if (!isCanonicalDensityInputUnit.value) return `kcal/${formatUnitLabel(measuredUnit.value)}`
  return getCanonicalDensitySuffixFromBasis(densityBasisFromUnit.value)
})
const macroInputSuffix = computed(() => {
  if (logMode.value === 'calories') return 'g'
  if (selectedUnitCategory.value === 'portion') return `g/${formatUnitLabel(measuredUnit.value)}`
  if (!isCanonicalDensityInputUnit.value) return `g/${formatUnitLabel(measuredUnit.value)}`
  return densityBasisFromUnit.value === 'volume' ? 'g/100ml' : 'g/100g'
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
    if (selectedUnitCategory.value === 'portion') return Math.round(amount * energy)
    if (!isCanonicalDensityInputUnit.value) return Math.round(amount * energy)
    const canonicalAmount = densityBasisFromUnit.value === 'volume'
      ? convertAmountBetweenUnits(amount, measuredUnit.value, 'ml')
      : convertAmountBetweenUnits(amount, measuredUnit.value, 'g')
    if (!Number.isFinite(canonicalAmount)) return 0
    return Math.round((canonicalAmount * energy) / 100)
  }
  const direct = Number(caloriesDirect.value)
  return Number.isFinite(direct) && direct >= 0 ? Math.round(direct) : 0
})
const computedTotalProtein = computed(() => computeMacroTotalForDisplay(proteinInput.value))
const computedTotalCarbohydrates = computed(() => computeMacroTotalForDisplay(carbohydratesInput.value))
const computedTotalFat = computed(() => computeMacroTotalForDisplay(fatInput.value))

const isDraftDirty = computed(() => {
  return JSON.stringify(draft.value) !== JSON.stringify(initialDraft.value)
    || logMode.value !== resolveMode(initialDraft.value)
    || measuredAmount.value !== parseMeasuredAmount(initialDraft.value).amount
    || measuredUnit.value !== parseMeasuredAmount(initialDraft.value).unit
    || measuredEnergy.value !== initialMeasuredEnergy()
    || caloriesDirect.value !== (Number(initialDraft.value.calories) || 0)
    || proteinInput.value !== deriveMacroInputFromEntry(initialDraft.value, 'protein')
    || carbohydratesInput.value !== deriveMacroInputFromEntry(initialDraft.value, 'carbohydrates')
    || fatInput.value !== deriveMacroInputFromEntry(initialDraft.value, 'fat')
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
    densityMode: 'none',
    densityBasis: 'mass',
    densityKcalPer100Canonical: null,
    usePer100g: false,
    caloriesPer100g: null,
    protein: null,
    carbohydrates: null,
    fat: null,
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
      unit: resolveUnitId(match[2]) || ''
    }
  }
  return { amount: '', unit: '' }
}

function hasServingMetadata(item) {
  const parsed = parseMeasuredAmount(item)
  return parsed.unit.startsWith('serv')
}

function initialMeasuredEnergy() {
  const source = initialDraft.value
  const parsedMeasured = parseMeasuredAmount(source)
  if (source.densityMode === 'per100') return canonicalDensityToDisplayedEnergy(source.densityKcalPer100Canonical)
  if (parsedMeasured.amount && hasServingMetadata(source)) {
    const numericAmount = Number(parsedMeasured.amount)
    return Number.isFinite(numericAmount) && numericAmount > 0
      ? Math.round((Number(source.calories) || 0) / numericAmount)
      : null
  }
  return null
}

function resolveMode(item) {
  if (!item) return 'calories'
  const hasLegacyDensity = item.caloriesPer100g !== null
    && item.caloriesPer100g !== undefined
    && Number.isFinite(Number(item.caloriesPer100g))
    && Number(item.caloriesPer100g) >= 0
  if (item.densityMode === 'per100' || Boolean(item.usePer100g) || hasLegacyDensity || hasServingMetadata(item)) return 'measured'
  return 'calories'
}

function canonicalDensityToDisplayedEnergy(canonicalDensity) {
  const value = Number(canonicalDensity)
  if (!Number.isFinite(value) || value < 0) return null
  if (selectedUnitCategory.value === 'portion') return value
  if (isCanonicalDensityInputUnit.value) return value
  const factor = Number(selectedUnit.value?.toBaseFactor)
  if (!Number.isFinite(factor) || factor <= 0) return null
  return (value * factor) / 100
}

function displayedEnergyToCanonicalDensity(displayedEnergy) {
  const value = Number(displayedEnergy)
  if (!Number.isFinite(value) || value < 0) return null
  if (selectedUnitCategory.value === 'portion') return null
  if (isCanonicalDensityInputUnit.value) return value
  const factor = Number(selectedUnit.value?.toBaseFactor)
  if (!Number.isFinite(factor) || factor <= 0) return null
  return (value * 100) / factor
}

function initializeDraft(entry, defaultSection) {
  const source = entry ? {
    id: entry.id || null,
    name: entry.name || '',
    amount: entry.amount || '',
    calories: Number(entry.calories) || 0,
    section: entry.section || defaultSection || '',
    densityMode: entry.densityMode === 'per100' ? 'per100' : (entry.usePer100g ? 'per100' : 'none'),
    densityBasis: entry.densityBasis === 'volume' ? 'volume' : 'mass',
    densityKcalPer100Canonical: Number.isFinite(Number(entry.densityKcalPer100Canonical))
      ? Number(entry.densityKcalPer100Canonical)
      : (entry.caloriesPer100g !== null && entry.caloriesPer100g !== undefined && Number.isFinite(Number(entry.caloriesPer100g)) ? Number(entry.caloriesPer100g) : null),
    usePer100g: Boolean(entry.usePer100g),
    caloriesPer100g: entry.caloriesPer100g ?? null,
    protein: Number.isFinite(Number(entry.protein)) ? Number(entry.protein) : null,
    carbohydrates: Number.isFinite(Number(entry.carbohydrates)) ? Number(entry.carbohydrates) : null,
    fat: Number.isFinite(Number(entry.fat)) ? Number(entry.fat) : null,
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

  if (source.densityMode === 'per100') {
    measuredEnergy.value = canonicalDensityToDisplayedEnergy(source.densityKcalPer100Canonical)
  } else if (parsedMeasured.amount && hasServingMetadata(source)) {
    const numericAmount = Number(parsedMeasured.amount)
    measuredEnergy.value = Number.isFinite(numericAmount) && numericAmount > 0
      ? Math.round((Number(source.calories) || 0) / numericAmount)
      : null
  } else {
    measuredEnergy.value = null
  }

  caloriesDirect.value = Number(source.calories) || 0
  proteinInput.value = logMode.value === 'measured'
    ? deriveMacroInputFromEntry(source, 'protein')
    : (Number.isFinite(Number(source.protein)) ? Number(source.protein) : null)
  carbohydratesInput.value = logMode.value === 'measured'
    ? deriveMacroInputFromEntry(source, 'carbohydrates')
    : (Number.isFinite(Number(source.carbohydrates)) ? Number(source.carbohydrates) : null)
  fatInput.value = logMode.value === 'measured'
    ? deriveMacroInputFromEntry(source, 'fat')
    : (Number.isFinite(Number(source.fat)) ? Number(source.fat) : null)
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
    densityMode: suggestion.densityMode === 'per100' ? 'per100' : (suggestion.usePer100g ? 'per100' : 'none'),
    densityBasis: suggestion.densityBasis === 'volume' ? 'volume' : 'mass',
    densityKcalPer100Canonical: Number.isFinite(Number(suggestion.densityKcalPer100Canonical))
      ? Number(suggestion.densityKcalPer100Canonical)
      : (suggestion.caloriesPer100g !== null && suggestion.caloriesPer100g !== undefined && Number.isFinite(Number(suggestion.caloriesPer100g)) ? Number(suggestion.caloriesPer100g) : null),
    usePer100g: Boolean(suggestion.usePer100g),
    caloriesPer100g: suggestion.caloriesPer100g ?? null,
    protein: Number.isFinite(Number(suggestion.protein)) ? Number(suggestion.protein) : null,
    carbohydrates: Number.isFinite(Number(suggestion.carbohydrates)) ? Number(suggestion.carbohydrates) : null,
    fat: Number.isFinite(Number(suggestion.fat)) ? Number(suggestion.fat) : null,
    notes: String(suggestion.notes || ''),
    tagsCsv: String(suggestion.tagsCsv || (Array.isArray(suggestion.tags) ? suggestion.tags.join(', ') : '')),
    section: draft.value.section || props.defaultSection || ''
  }

  const parsedMeasured = parseMeasuredAmount(suggestion)
  measuredAmount.value = parsedMeasured.amount
  if (parsedMeasured.unit && unitOptions.value.some(option => option.value === parsedMeasured.unit)) {
    measuredUnit.value = parsedMeasured.unit
  }
  if (suggestion.densityMode === 'per100' || suggestion.usePer100g) {
    const fallbackCanonical = Number.isFinite(Number(suggestion.densityKcalPer100Canonical))
      ? Number(suggestion.densityKcalPer100Canonical)
      : (suggestion.caloriesPer100g !== null && suggestion.caloriesPer100g !== undefined && Number.isFinite(Number(suggestion.caloriesPer100g)) ? Number(suggestion.caloriesPer100g) : null)
    measuredEnergy.value = canonicalDensityToDisplayedEnergy(fallbackCanonical)
  } else if (hasServingMetadata(suggestion) && Number(suggestion.calories) > 0 && Number(parsedMeasured.amount) > 0) {
    measuredEnergy.value = Math.round(Number(suggestion.calories) / Number(parsedMeasured.amount))
  } else {
    measuredEnergy.value = null
  }
  caloriesDirect.value = Number(suggestion.calories) || 0
  proteinInput.value = logMode.value === 'measured'
    ? deriveMacroInputFromEntry(suggestion, 'protein')
    : (Number.isFinite(Number(suggestion.protein)) ? Number(suggestion.protein) : null)
  carbohydratesInput.value = logMode.value === 'measured'
    ? deriveMacroInputFromEntry(suggestion, 'carbohydrates')
    : (Number.isFinite(Number(suggestion.carbohydrates)) ? Number(suggestion.carbohydrates) : null)
  fatInput.value = logMode.value === 'measured'
    ? deriveMacroInputFromEntry(suggestion, 'fat')
    : (Number.isFinite(Number(suggestion.fat)) ? Number(suggestion.fat) : null)
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
  const protein = normalizeMacroPayloadValue(logMode.value === 'measured' ? computeMacroTotalFromMeasured(proteinInput.value) : proteinInput.value)
  const carbohydrates = normalizeMacroPayloadValue(logMode.value === 'measured' ? computeMacroTotalFromMeasured(carbohydratesInput.value) : carbohydratesInput.value)
  const fat = normalizeMacroPayloadValue(logMode.value === 'measured' ? computeMacroTotalFromMeasured(fatInput.value) : fatInput.value)
  const base = {
    id: draft.value.id,
    name: String(draft.value.name || '').trim(),
    section: draft.value.section || '',
    protein: Number.isFinite(protein) && protein >= 0 ? Math.round(protein * 10) / 10 : null,
    carbohydrates: Number.isFinite(carbohydrates) && carbohydrates >= 0 ? Math.round(carbohydrates * 10) / 10 : null,
    fat: Number.isFinite(fat) && fat >= 0 ? Math.round(fat * 10) / 10 : null,
    notes: String(draft.value.notes || '').trim(),
    tagsCsv: String(draft.value.tagsCsv || '').trim()
  }

  if (logMode.value === 'measured') {
    const isPer100Unit = getUnitById(measuredUnit.value)?.category !== 'portion'
    const canonicalDensity = isPer100Unit ? displayedEnergyToCanonicalDensity(measuredEnergy.value) : null
    return {
      ...base,
      amount: `${Number(measuredAmount.value)} ${measuredUnit.value}`,
      calories: computedTotalCalories.value,
      densityMode: isPer100Unit ? 'per100' : 'none',
      densityBasis: densityBasisFromUnit.value,
      densityKcalPer100Canonical: canonicalDensity,
      usePer100g: isPer100Unit && densityBasisFromUnit.value === 'mass',
      caloriesPer100g: isPer100Unit && densityBasisFromUnit.value === 'mass' ? canonicalDensity : null
    }
  }

  return {
    ...base,
    amount: String(draft.value.amount || '').trim(),
    calories: computedTotalCalories.value,
    densityMode: 'none',
    densityBasis: 'mass',
    densityKcalPer100Canonical: null,
    usePer100g: false,
    caloriesPer100g: null
  }
}

function normalizeMacroPayloadValue(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return numeric
}

function computeMacroTotalFromMeasured(densityValue) {
  const amount = Number(measuredAmount.value)
  const density = Number(densityValue)
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(density) || density < 0) return null
  if (selectedUnitCategory.value === 'portion') return Math.round(amount * density * 10) / 10
  if (!isCanonicalDensityInputUnit.value) return Math.round(amount * density * 10) / 10
  const canonicalAmount = densityBasisFromUnit.value === 'volume'
    ? convertAmountBetweenUnits(amount, measuredUnit.value, 'ml')
    : convertAmountBetweenUnits(amount, measuredUnit.value, 'g')
  if (!Number.isFinite(canonicalAmount)) return null
  return Math.round(((canonicalAmount * density) / 100) * 10) / 10
}

function computeMacroTotalForDisplay(value) {
  if (!props.showMacroFields) return null
  if (logMode.value === 'measured') return computeMacroTotalFromMeasured(value)
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 10) / 10 : null
}

function deriveMacroInputFromEntry(entry, key) {
  const total = Number(entry?.[key])
  if (!Number.isFinite(total) || total < 0) return null
  const parsedMeasured = parseMeasuredAmount(entry)
  const amount = Number(parsedMeasured.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const unit = resolveUnitId(parsedMeasured.unit)
  const category = getUnitById(unit)?.category || 'mass'
  if (category === 'portion') return Math.round((total / amount) * 10) / 10
  if (unit !== 'g' && unit !== 'ml') return Math.round((total / amount) * 10) / 10
  const canonicalAmount = unit === 'ml'
    ? convertAmountBetweenUnits(amount, unit, 'ml')
    : convertAmountBetweenUnits(amount, unit, 'g')
  if (!Number.isFinite(canonicalAmount) || canonicalAmount <= 0) return null
  return Math.round(((total * 100) / canonicalAmount) * 10) / 10
}

function formatMacroForSummary(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return '—'
  return `${numeric.toFixed(1).replace(/\.0$/, '')} g`
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

.nutrition-summary {
  border: 1px solid rgba(25, 118, 210, 0.22);
  border-radius: 10px;
  background: #f8fbff;
  overflow: hidden;
  color: #1c2b3a;
  font-family: 'Arial Black', Arial, Helvetica, sans-serif;
  width: 100%;
  margin-left: 0;
  margin-right: auto;
}

@media (min-width: 600px) {
  .nutrition-summary {
    max-width: 420px;
  }
}

.nutrition-title {
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: 0;
  text-transform: none;
  color: #1c2b3a;
  padding: 6px 8px 4px;
  background: rgba(25, 118, 210, 0.08);
}

.nutrition-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  border-top: 1px solid rgba(25, 118, 210, 0.16);
  font-size: 0.9rem;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 700;
  letter-spacing: 0;
}

.nutrition-row-main {
  border-top: 0;
  font-size: 1.08rem;
  font-weight: 800;
}

.nutrition-row-main strong {
  font-family: 'Arial Black', Arial, Helvetica, sans-serif;
  font-size: 1.2rem;
  line-height: 1;
  color: #0f4c8a;
}

.nutrition-rule {
  width: 100%;
  background: rgba(25, 118, 210, 0.35);
}

.nutrition-rule-thick {
  height: 4px;
}

.nutrition-rule-medium {
  height: 2px;
}
</style>
