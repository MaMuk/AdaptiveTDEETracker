<template>
  <q-page
    padding
    class="diary-ai-page"
  >
    <q-card>
      <q-card-section class="row items-center justify-between q-py-sm">
        <div class="text-h6">
          AI Meal Recognition (Experimental)
        </div>
        <q-btn
          flat
          icon="arrow_back"
          label="Back to Diary"
          @click="goBack"
        />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-caption q-mb-sm">
          The selected image is sent directly to OpenAI using your configured API key. Image is not stored on this device.
        </div>

        <q-banner
          v-if="errorMessage"
          rounded
          dense
          class="bg-red-1 text-negative q-mb-sm"
        >
          {{ errorMessage }}
        </q-banner>
        <q-banner
          v-if="warningMessage"
          rounded
          dense
          class="bg-orange-1 text-warning q-mb-sm"
        >
          {{ warningMessage }}
        </q-banner>
        <q-banner
          v-if="demoMessage"
          rounded
          dense
          class="bg-blue-1 text-primary q-mb-sm"
        >
          {{ demoMessage }}
        </q-banner>

        <q-checkbox
          v-model="isNutritionLabel"
          label="Nutrition label mode (for packaged products / labels)"
          class="q-mb-sm"
        />

        <div class="row q-gutter-sm">
          <q-btn
            outline
            icon="photo_camera"
            label="Take Photo"
            :disable="isRecognizing || isLabelImageCapReached"
            @click="openCameraPicker"
          />
          <q-btn
            outline
            icon="collections"
            :label="isNutritionLabel ? 'Add from Gallery' : 'Choose from Gallery'"
            :disable="isRecognizing || isLabelImageCapReached"
            @click="openGalleryPicker"
          />
          <q-btn
            flat
            label="Clear Photo"
            :disable="selectedImageDataUrls.length === 0 || isRecognizing"
            @click="clearTransientImageData"
          />
        </div>
        <input
          ref="cameraInputRef"
          type="file"
          accept="image/*"
          capture="environment"
          style="display: none"
          @change="onFileInputChange"
        >
        <input
          ref="galleryInputRef"
          type="file"
          accept="image/*"
          :multiple="isNutritionLabel"
          style="display: none"
          @change="onFileInputChange"
        >
        <div
          v-if="isLabelImageCapReached"
          class="text-caption text-info q-mt-xs"
        >
          Nutrition label mode allows up to 2 photos.
        </div>

        <div
          v-if="selectedImageDataUrls.length > 0"
          class="q-mt-md"
        >
          <div class="text-caption q-mb-xs">
            Selected photos: {{ selectedImageDataUrls.length }}<span v-if="selectedImageDataUrls.length > 1"> · {{ activeImageIndex + 1 }}/{{ selectedImageDataUrls.length }}</span>
          </div>
          <div class="ai-image-preview-wrap">
            <div class="ai-image-preview-backdrop" />
            <q-img
              class="ai-image-preview"
              :src="activeImageSrc"
              fit="contain"
              style="max-height: 300px; border-radius: 8px;"
            />
            <q-btn
              v-if="selectedImageDataUrls.length > 1"
              class="absolute-left q-ml-xs ai-overlay-btn"
              style="top: 50%; transform: translateY(-50%); z-index: 2;"
              dense
              flat
              icon="chevron_left"
              @click.stop="showPreviousImage"
            />
            <q-btn
              v-if="selectedImageDataUrls.length > 1"
              class="absolute-right q-mr-xs ai-overlay-btn"
              style="top: 50%; transform: translateY(-50%); z-index: 2;"
              dense
              flat
              icon="chevron_right"
              @click.stop="showNextImage"
            />
            <div
              class="absolute-top-right q-pa-xs"
              style="z-index: 2;"
            >
              <q-btn
                dense
                flat
                class="ai-overlay-btn ai-overlay-btn-negative"
                icon="close"
                @click.stop="removeActiveImage()"
              />
            </div>
          </div>
        </div>

        <q-input
          v-model="additionalContext"
          class="q-mt-md"
          filled
          type="textarea"
          autogrow
          label="Optional context for AI"
          hint="Example: chicken wrap with garlic sauce, homemade, large portion."
        />

        <div class="row q-gutter-sm q-mt-md">
          <q-btn
            color="primary"
            label="Analyze Meal"
            :disable="selectedImageDataUrls.length === 0 || isRecognizing"
            :loading="isRecognizing"
            @click="recognizeMeal"
          />
          <q-btn
            flat
            label="Clear"
            :disable="selectedImageDataUrls.length === 0 || isRecognizing"
            @click="clearFlow"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card
      v-if="guesses.length > 0"
      class="q-mt-md"
    >
      <q-card-section>
        <div class="text-subtitle1">
          Review AI Guesses
        </div>
        <div class="text-caption q-mb-sm">
          Select a guess, then edit before saving. You are always the final authority.
        </div>

        <q-list
          bordered
          separator
        >
          <q-item
            v-for="(guess, idx) in guesses"
            :key="idx"
            clickable
            :active="selectedGuessIndex === idx"
            active-class="bg-blue-1"
            @click="selectGuess(idx)"
          >
            <q-item-section>
              <q-item-label>{{ guess.name }}</q-item-label>
              <q-item-label caption>
                {{ guess.calories.low }} - {{ guess.calories.high }} kcal · estimate {{ guess.calories.estimate }} · confidence {{ guess.confidence }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <q-card-section v-if="selectedGuess">
        <q-input
          v-model="draftName"
          filled
          label="Food name"
          class="q-mb-md"
        />

        <div class="text-caption q-mb-xs">
          Estimated calories
        </div>
        <q-slider
          v-model="draftCalories"
          :min="sliderMin"
          :max="sliderMax"
          :step="sliderStep"
          snap
          label
          :marker-labels="sliderMarkers"
          color="primary"
          class="q-mb-sm"
        />

        <q-input
          v-model.number="draftCalories"
          type="number"
          min="0"
          step="1"
          filled
          label="Calories (manual)"
          hint="Manual input can exceed slider maximum when needed."
          class="q-mb-sm"
        />

        <q-select
          v-model="draftSection"
          :options="sectionOptions"
          filled
          emit-value
          map-options
          label="Diary section"
          class="q-mb-sm"
        />

        <div
          v-if="store.diaryMacroTrackingEnabled"
          class="row q-col-gutter-sm q-mb-sm"
        >
          <div class="col-12 col-sm-4">
            <q-input
              v-model.number="draftProtein"
              type="number"
              min="0"
              step="0.1"
              filled
              label="Protein (g)"
            />
          </div>
          <div class="col-12 col-sm-4">
            <q-input
              v-model.number="draftCarbohydrates"
              type="number"
              min="0"
              step="0.1"
              filled
              label="Carbohydrates (g)"
            />
          </div>
          <div class="col-12 col-sm-4">
            <q-input
              v-model.number="draftFat"
              type="number"
              min="0"
              step="0.1"
              filled
              label="Fat (g)"
            />
          </div>
        </div>

        <q-btn
          color="positive"
          label="Save to Diary"
          @click="saveToDiary"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '../stores/user'
import { createAiMealRecognitionService } from '../services/aiMealRecognition'
import { useAiImageAcquisition } from '../composables/useAiImageAcquisition'

const store = useUserStore()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const selectedDate = ref(String(route.query.date || new Date().toISOString().split('T')[0]))
const initialSection = String(route.query.section || '')
const isNutritionLabel = ref(false)
const MAX_LABEL_IMAGES = 2
const guesses = ref([])
const selectedGuessIndex = ref(0)
const draftName = ref('')
const draftCalories = ref(0)
const draftProtein = ref(null)
const draftCarbohydrates = ref(null)
const draftFat = ref(null)
const lastDraftCaloriesForScaling = ref(null)
const draftSection = ref('')
const activeImageIndex = ref(0)
const isRecognizing = ref(false)
const errorMessage = ref('')
const warningMessage = ref('')
const demoMessage = ref('')
const additionalContext = ref('')
const {
  cameraInputRef,
  galleryInputRef,
  selectedImageDataUrls,
  clearTransientImageData,
  removeSelectedImageAt,
  onFileInputChange,
  openCameraPicker,
  openGalleryPicker,
  getPreprocessedSelectedImage,
  getPreprocessedSelectedImages
} = useAiImageAcquisition({
  isBusy: isRecognizing,
  maxSelectedImages: computed(() => (isNutritionLabel.value ? MAX_LABEL_IMAGES : null)),
  appendOnCameraCapture: computed(() => isNutritionLabel.value),
  onError: (message) => {
    errorMessage.value = message
  },
  onWarning: (message) => {
    warningMessage.value = message
  }
})
const isLabelImageCapReached = computed(() => isNutritionLabel.value && selectedImageDataUrls.value.length >= MAX_LABEL_IMAGES)
const activeImageSrc = computed(() => selectedImageDataUrls.value[activeImageIndex.value] || '')

const sectionOptions = computed(() => ([
  { label: 'Unsectioned', value: '' },
  ...store.diarySections.map(section => ({ label: section, value: section }))
]))

const selectedGuess = computed(() => guesses.value[selectedGuessIndex.value] || null)

const sliderMin = computed(() => {
  if (!selectedGuess.value) return 0
  const low = Number(selectedGuess.value.calories.low) || 0
  const high = Number(selectedGuess.value.calories.high) || low
  const estimate = Number(selectedGuess.value.calories.estimate) || low
  const span = Math.max(0, high - low)
  const pad = Math.max(40, Math.round(span * 0.8))
  let min = Math.max(0, low - pad)
  let max = high + pad
  const minSpan = 240
  if ((max - min) < minSpan) {
    min = Math.max(0, Math.round(estimate - (minSpan / 2)))
    max = Math.round(min + minSpan)
  }
  return Math.round(min)
})

const sliderMax = computed(() => {
  if (!selectedGuess.value) return 1500
  const low = Number(selectedGuess.value.calories.low) || 0
  const high = Number(selectedGuess.value.calories.high) || low
  const estimate = Number(selectedGuess.value.calories.estimate) || low
  const span = Math.max(0, high - low)
  const pad = Math.max(40, Math.round(span * 0.8))
  let min = Math.max(0, low - pad)
  let max = high + pad
  const minSpan = 240
  if ((max - min) < minSpan) {
    min = Math.max(0, Math.round(estimate - (minSpan / 2)))
    max = Math.round(min + minSpan)
  }
  return Math.round(max)
})

const sliderStep = computed(() => {
  const span = Math.max(1, sliderMax.value - sliderMin.value)
  if (span <= 180) return 1
  if (span <= 360) return 2
  if (span <= 800) return 5
  return 25
})

const sliderMarkers = computed(() => {
  if (!selectedGuess.value) return {}
  const low = Number(selectedGuess.value.calories.low) || 0
  const estimate = Number(selectedGuess.value.calories.estimate) || low
  const high = Number(selectedGuess.value.calories.high) || estimate
  const markers = {}
  if (low >= sliderMin.value && low <= sliderMax.value) markers[low] = 'L'
  if (estimate >= sliderMin.value && estimate <= sliderMax.value) markers[estimate] = 'E'
  if (high >= sliderMin.value && high <= sliderMax.value) markers[high] = 'H'
  return markers
})

onMounted(() => {
  if (!store.aiMealRecognitionEnabled) {
    router.replace({ path: '/diary', query: { date: selectedDate.value } })
    return
  }

  if (initialSection && store.diarySections.includes(initialSection)) {
    draftSection.value = initialSection
  }

  if (!store.openAiApiKey) {
    warningMessage.value = 'No OpenAI API key set. Analysis will use a built-in demo response.'
  }
})

onBeforeUnmount(() => {
  clearTransientImageData()
})

function clearFlow() {
  clearTransientImageData()
  activeImageIndex.value = 0
  guesses.value = []
  selectedGuessIndex.value = 0
  draftName.value = ''
  draftCalories.value = 0
  draftProtein.value = null
  draftCarbohydrates.value = null
  draftFat.value = null
  lastDraftCaloriesForScaling.value = null
  warningMessage.value = ''
  demoMessage.value = ''
  errorMessage.value = ''
  additionalContext.value = ''
  isNutritionLabel.value = false
}

watch(selectedImageDataUrls, (images) => {
  if (!Array.isArray(images) || images.length === 0) {
    activeImageIndex.value = 0
    return
  }
  if (activeImageIndex.value >= images.length) {
    activeImageIndex.value = images.length - 1
  }
})

function showPreviousImage() {
  if (selectedImageDataUrls.value.length <= 1) return
  activeImageIndex.value = activeImageIndex.value === 0
    ? selectedImageDataUrls.value.length - 1
    : activeImageIndex.value - 1
}

function showNextImage() {
  if (selectedImageDataUrls.value.length <= 1) return
  activeImageIndex.value = activeImageIndex.value === selectedImageDataUrls.value.length - 1
    ? 0
    : activeImageIndex.value + 1
}

function removeActiveImage() {
  const total = selectedImageDataUrls.value.length
  if (total <= 0) return
  const indexToRemove = activeImageIndex.value
  const nextTotal = total - 1
  if (nextTotal <= 0) {
    activeImageIndex.value = 0
  } else if (indexToRemove >= nextTotal) {
    activeImageIndex.value = nextTotal - 1
  } else {
    activeImageIndex.value = indexToRemove
  }
  removeSelectedImageAt(indexToRemove)
}

watch(draftCalories, (next) => {
  if (!store.diaryMacroTrackingEnabled) return
  const current = Number(next)
  const previous = Number(lastDraftCaloriesForScaling.value)
  if (!Number.isFinite(current) || current < 0) return

  if (Number.isFinite(previous) && previous > 0 && current !== previous) {
    const ratio = current / previous
    if (Number.isFinite(ratio) && ratio > 0) {
      draftProtein.value = scaleMacroValue(draftProtein.value, ratio)
      draftCarbohydrates.value = scaleMacroValue(draftCarbohydrates.value, ratio)
      draftFat.value = scaleMacroValue(draftFat.value, ratio)
    }
  }

  lastDraftCaloriesForScaling.value = current > 0 ? current : null
})

async function recognizeMeal() {
  errorMessage.value = ''
  warningMessage.value = ''

  if (!store.aiMealRecognitionEnabled) {
    errorMessage.value = 'Experimental AI meal recognition is disabled in Settings.'
    return
  }
  if (!store.openAiApiKey) {
    warningMessage.value = 'No OpenAI API key set. A demo response will be used.'
  }
  if (selectedImageDataUrls.value.length === 0) {
    errorMessage.value = 'Select an image before starting recognition.'
    return
  }

  isRecognizing.value = true
  try {
    const preprocessedList = isNutritionLabel.value
      ? await getPreprocessedSelectedImages({ maxDimension: 1024, quality: 0.75 })
      : [await getPreprocessedSelectedImage({ maxDimension: 1024, quality: 0.75 })].filter(Boolean)
    const imageDataUrls = preprocessedList.map(item => item?.dataUrl).filter(Boolean)
    if (imageDataUrls.length === 0) {
      errorMessage.value = 'Could not preprocess selected image.'
      return
    }

    const service = createAiMealRecognitionService({ provider: 'openai' })
    const result = await service.recognizeMealFromImage({
      apiKey: store.openAiApiKey,
      imageDataUrl: imageDataUrls[0],
      imageDataUrls,
      context: 'diary',
      isNutritionLabel: isNutritionLabel.value,
      userContext: String(additionalContext.value || '').trim()
    })

    guesses.value = result.guesses
    demoMessage.value = result.provider === 'openai-demo'
      ? 'Demo response only: these guesses are mocked for preview and not generated from your image.'
      : ''

    if (guesses.value.length === 0) {
      errorMessage.value = 'No usable guesses were returned. Try another photo.'
      return
    }

    selectGuess(0)
  } catch (error) {
    errorMessage.value = error?.message || 'Recognition failed. Please try again.'
  } finally {
    isRecognizing.value = false
  }
}

function selectGuess(index) {
  selectedGuessIndex.value = index
  const guess = guesses.value[index]
  if (!guess) return

  draftName.value = guess.name
  draftCalories.value = Number(guess.calories.estimate) || 0
  draftProtein.value = toNullableMacro(guess.protein)
  draftCarbohydrates.value = toNullableMacro(guess.carbohydrates)
  draftFat.value = toNullableMacro(guess.fat)
  lastDraftCaloriesForScaling.value = Number(draftCalories.value) > 0 ? Number(draftCalories.value) : null

  if (guess.confidence === 'low') {
    warningMessage.value = 'Low confidence result. Review and edit carefully before saving.'
  } else {
    warningMessage.value = ''
  }
}

function saveToDiary() {
  errorMessage.value = ''

  const name = String(draftName.value || '').trim()
  const calories = Number(draftCalories.value)

  if (!name) {
    errorMessage.value = 'Food name is required.'
    return
  }

  if (!Number.isFinite(calories) || calories < 0) {
    errorMessage.value = 'Calories must be a valid non-negative number.'
    return
  }

  store.addDiaryEntry(selectedDate.value, {
    name,
    amount: '',
    calories: Math.round(calories),
    section: draftSection.value,
    protein: toNullableMacro(draftProtein.value),
    carbohydrates: toNullableMacro(draftCarbohydrates.value),
    fat: toNullableMacro(draftFat.value),
    usePer100g: false,
    caloriesPer100g: null
  })

  $q.notify({
    type: 'positive',
    message: 'Entry added to diary.'
  })

  goBack()
}

function goBack() {
  clearFlow()
  router.push({ path: '/diary', query: { date: selectedDate.value } })
}

function toNullableMacro(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null
}

function scaleMacroValue(value, ratio) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return value
  return Math.round(numeric * ratio * 10) / 10
}
</script>

<style scoped>
.ai-image-preview-wrap {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.ai-image-preview-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  z-index: 0;
}

.ai-image-preview {
  position: relative;
  z-index: 1;
}

.ai-overlay-btn {
  min-width: 40px;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 8px;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(140%) blur(1px);
  border: 1px solid rgba(31, 41, 55, 0.12);
}

.ai-overlay-btn-negative {
  color: #b42318;
  background: rgba(255, 245, 245, 0.9);
  border-color: rgba(180, 35, 24, 0.22);
}
</style>
