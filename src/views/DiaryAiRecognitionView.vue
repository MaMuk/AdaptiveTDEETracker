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

        <div class="row q-gutter-sm">
          <q-btn
            outline
            icon="photo_camera"
            label="Take Photo"
            :disable="isRecognizing"
            @click="openCameraPicker"
          />
          <q-btn
            outline
            icon="collections"
            label="Choose from Gallery"
            :disable="isRecognizing"
            @click="openGalleryPicker"
          />
          <q-btn
            flat
            label="Clear Photo"
            :disable="!selectedImageDataUrl || isRecognizing"
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
          style="display: none"
          @change="onFileInputChange"
        >

        <div
          v-if="selectedImageDataUrl"
          class="q-mt-md"
        >
          <q-img
            :src="selectedImageDataUrl"
            fit="contain"
            style="max-height: 300px; border-radius: 8px;"
          />
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
            :disable="!selectedImageDataUrl || isRecognizing"
            :loading="isRecognizing"
            @click="recognizeMeal"
          />
          <q-btn
            flat
            label="Clear"
            :disable="!selectedImageDataUrl || isRecognizing"
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
          :min="0"
          :max="sliderMax"
          :step="25"
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
const guesses = ref([])
const selectedGuessIndex = ref(0)
const draftName = ref('')
const draftCalories = ref(0)
const draftSection = ref('')
const isRecognizing = ref(false)
const errorMessage = ref('')
const warningMessage = ref('')
const demoMessage = ref('')
const additionalContext = ref('')
const {
  cameraInputRef,
  galleryInputRef,
  selectedImageDataUrl,
  clearTransientImageData,
  onFileInputChange,
  openCameraPicker,
  openGalleryPicker,
  getPreprocessedSelectedImage
} = useAiImageAcquisition({
  isBusy: isRecognizing,
  onError: (message) => {
    errorMessage.value = message
  },
  onWarning: (message) => {
    warningMessage.value = message
  }
})

const sectionOptions = computed(() => ([
  { label: 'Unsectioned', value: '' },
  ...store.diarySections.map(section => ({ label: section, value: section }))
]))

const selectedGuess = computed(() => guesses.value[selectedGuessIndex.value] || null)

const sliderMax = computed(() => {
  if (!selectedGuess.value) return 1500
  return Math.max(Number(selectedGuess.value.calories.high) || 0, 1500)
})

const sliderMarkers = computed(() => {
  if (!selectedGuess.value) return {}
  return {
    [selectedGuess.value.calories.low]: 'L',
    [selectedGuess.value.calories.estimate]: 'E',
    [selectedGuess.value.calories.high]: 'H'
  }
})

onMounted(() => {
  if (!store.aiMealRecognitionEnabled) {
    router.replace({ path: '/diary', query: { date: selectedDate.value } })
    return
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
  guesses.value = []
  selectedGuessIndex.value = 0
  draftName.value = ''
  draftCalories.value = 0
  warningMessage.value = ''
  demoMessage.value = ''
  errorMessage.value = ''
  additionalContext.value = ''
}

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
  if (!selectedImageDataUrl.value) {
    errorMessage.value = 'Select an image before starting recognition.'
    return
  }

  isRecognizing.value = true
  try {
    const preprocessed = await getPreprocessedSelectedImage({ maxDimension: 1024, quality: 0.75 })
    if (!preprocessed?.dataUrl) {
      errorMessage.value = 'Could not preprocess selected image.'
      return
    }

    const service = createAiMealRecognitionService({ provider: 'openai' })
    const result = await service.recognizeMealFromImage({
      apiKey: store.openAiApiKey,
      imageDataUrl: preprocessed.dataUrl,
      context: 'diary',
      isNutritionLabel: false,
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
</script>
