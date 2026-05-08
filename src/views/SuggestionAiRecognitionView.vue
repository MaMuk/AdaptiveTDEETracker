<template>
  <q-page padding>
    <q-card>
      <q-card-section class="row items-center justify-between q-py-sm">
        <div class="text-h6">AI Suggestion Recognition (Experimental)</div>
        <q-btn flat icon="arrow_back" label="Back to Suggestions" @click="goBack" />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-caption q-mb-sm">Experimental feature. The selected image is sent directly to OpenAI using your configured API key. Image is not permanently stored.</div>

        <q-banner v-if="errorMessage" rounded dense class="bg-red-1 text-negative q-mb-sm">
          {{ errorMessage }}
        </q-banner>
        <q-banner v-if="warningMessage" rounded dense class="bg-orange-1 text-warning q-mb-sm">
          {{ warningMessage }}
        </q-banner>
        <q-banner v-if="demoMessage" rounded dense class="bg-blue-1 text-primary q-mb-sm">
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
        />
        <input
          ref="galleryInputRef"
          type="file"
          accept="image/*"
          style="display: none"
          @change="onFileInputChange"
        />

        <div v-if="selectedImageDataUrl" class="q-mt-md">
          <q-img :src="selectedImageDataUrl" fit="contain" style="max-height: 300px; border-radius: 8px;" />
        </div>

        <q-input
          v-model="additionalContext"
          class="q-mt-md"
          filled
          type="textarea"
          autogrow
          label="Optional context for AI"
          hint="Example: protein bar, chocolate flavor, 55g package."
        />

        <div class="row q-gutter-sm q-mt-md">
          <q-btn color="primary" label="Analyze Product" :disable="!selectedImageDataUrl || isRecognizing" :loading="isRecognizing" @click="recognize" />
          <q-btn flat label="Clear" :disable="!selectedImageDataUrl || isRecognizing" @click="clearFlow" />
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="guesses.length > 0" class="q-mt-md">
      <q-card-section>
        <div class="text-subtitle1">Review AI Guesses</div>
        <div class="text-caption q-mb-sm">Pick a guess and edit it before adding to Suggestions.</div>

        <q-list bordered separator>
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
              <q-item-label caption v-if="guess.caloriesPer100g !== null && guess.caloriesPer100g !== undefined">
                /100g estimate: {{ guess.caloriesPer100g }} kcal
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Edit Suggestion</div>

        <q-input v-model="draftName" filled label="Product / Food name" class="q-mb-sm" hint="If label photo has no product name, enter it manually." />
        <q-input v-model="draftAmount" filled label="Amount" class="q-mb-sm" hint="Example: 1 serving, 100 g, 1 bar" />

        <q-checkbox v-model="draftUsePer100g" label="Use calories per 100 g" class="q-mb-sm" />

        <q-input
          v-if="!draftUsePer100g"
          v-model.number="draftCalories"
          type="number"
          min="0"
          step="1"
          filled
          label="Calories (kcal)"
          class="q-mb-sm"
        />

        <q-input
          v-else
          v-model.number="draftCaloriesPer100g"
          type="number"
          min="0"
          step="1"
          filled
          label="Calories per 100 g"
          class="q-mb-sm"
        />

        <q-btn color="positive" label="Add to Suggestions" @click="saveSuggestion" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useUserStore } from '../stores/user'
import { createAiMealRecognitionService } from '../services/aiMealRecognition'
import { preprocessImageDataUrl } from '../services/aiMealRecognition/imagePreprocessing'

const store = useUserStore()
const router = useRouter()
const $q = useQuasar()

const selectedFile = ref(null)
const cameraInputRef = ref(null)
const galleryInputRef = ref(null)
const selectedImageDataUrl = ref('')
const isNutritionLabel = ref(false)
const isRecognizing = ref(false)
const isOpeningCamera = ref(false)
const guesses = ref([])
const selectedGuessIndex = ref(0)
const errorMessage = ref('')
const warningMessage = ref('')
const demoMessage = ref('')
const additionalContext = ref('')

const draftName = ref('')
const draftAmount = ref('')
const draftUsePer100g = ref(false)
const draftCalories = ref(0)
const draftCaloriesPer100g = ref(null)

onMounted(() => {
  if (!store.aiMealRecognitionEnabled) {
    router.replace('/suggestions')
    return
  }

  if (!store.openAiApiKey) {
    warningMessage.value = 'No OpenAI API key set. Analysis will use a built-in demo response.'
  }
})

onBeforeUnmount(() => {
  clearTransientImageData()
})

function clearTransientImageData() {
  selectedFile.value = null
  selectedImageDataUrl.value = ''
}

function clearFlow() {
  clearTransientImageData()
  guesses.value = []
  selectedGuessIndex.value = 0
  draftName.value = ''
  draftAmount.value = ''
  draftUsePer100g.value = false
  draftCalories.value = 0
  draftCaloriesPer100g.value = null
  errorMessage.value = ''
  warningMessage.value = ''
  demoMessage.value = ''
  additionalContext.value = ''
}

function onImageSelected(file) {
  errorMessage.value = ''
  demoMessage.value = ''

  if (!file) {
    selectedImageDataUrl.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    selectedImageDataUrl.value = String(reader.result || '')
  }
  reader.onerror = () => {
    errorMessage.value = 'Could not read selected image.'
  }
  reader.readAsDataURL(file)
}

async function openCameraPicker() {
  if (isOpeningCamera.value || isRecognizing.value) return
  isOpeningCamera.value = true
  warningMessage.value = ''
  try {
    if (Capacitor.isPluginAvailable('Camera')) {
      const captured = await tryCaptureWithCapacitorCamera()
      if (!captured) {
        warningMessage.value = 'No photo captured.'
      }
      return
    }
    warningMessage.value = 'Direct camera capture plugin is unavailable. Falling back to browser file picker.'
    cameraInputRef.value?.click()
  } catch {
    warningMessage.value = 'Camera action failed.'
  } finally {
    isOpeningCamera.value = false
  }
}

function openGalleryPicker() {
  galleryInputRef.value?.click()
}

function onFileInputChange(event) {
  const file = event?.target?.files?.[0] || null
  onImageSelected(file)
  if (event?.target) {
    event.target.value = ''
  }
}

async function tryCaptureWithCapacitorCamera() {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    })
    const resolvedDataUrl = await resolvePhotoToDataUrl(photo)
    if (resolvedDataUrl) {
      onImageSelected(dataUrlToFile(resolvedDataUrl, 'camera-photo.jpg'))
      return true
    }
    return false
  } catch {
    return false
  }
}

async function resolvePhotoToDataUrl(photo) {
  if (photo?.dataUrl) return photo.dataUrl
  if (photo?.base64String) return `data:image/jpeg;base64,${photo.base64String}`
  if (photo?.webPath) {
    const response = await fetch(photo.webPath)
    const blob = await response.blob()
    return await blobToDataUrl(blob)
  }
  return ''
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read camera image blob.'))
    reader.readAsDataURL(blob)
  })
}

function dataUrlToFile(dataUrl, filename) {
  const [meta, base64] = String(dataUrl).split(',')
  const mimeMatch = /data:([^;]+);base64/.exec(meta || '')
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], filename, { type: mimeType })
}

async function recognize() {
  errorMessage.value = ''
  demoMessage.value = ''

  if (!store.aiMealRecognitionEnabled) {
    errorMessage.value = 'Experimental AI meal recognition is disabled in Settings.'
    return
  }

  if (!selectedImageDataUrl.value) {
    errorMessage.value = 'Select an image before starting recognition.'
    return
  }

  if (!store.openAiApiKey) {
    warningMessage.value = 'No OpenAI API key set. A demo response will be used.'
  }

  isRecognizing.value = true
  try {
    const preprocessed = await preprocessImageDataUrl(selectedImageDataUrl.value, {
      maxDimension: 1024,
      quality: 0.75
    })

    const service = createAiMealRecognitionService({ provider: 'openai' })
    const result = await service.recognizeMealFromImage({
      apiKey: store.openAiApiKey,
      imageDataUrl: preprocessed.dataUrl,
      context: 'suggestions',
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
  draftUsePer100g.value = isNutritionLabel.value
  draftCaloriesPer100g.value = Number.isFinite(Number(guess.caloriesPer100g))
    ? Number(guess.caloriesPer100g)
    : (isNutritionLabel.value ? Number(guess.calories.estimate) || 0 : null)

  if (guess.confidence === 'low') {
    warningMessage.value = 'Low confidence result. Review and edit carefully before adding.'
  }
}

function saveSuggestion() {
  const name = String(draftName.value || '').trim()
  const amount = String(draftAmount.value || '').trim()
  const calories = Number(draftCalories.value)
  const caloriesPer100g = Number(draftCaloriesPer100g.value)

  if (!name) {
    errorMessage.value = 'Suggestion name is required.'
    return
  }

  if (draftUsePer100g.value) {
    if (!Number.isFinite(caloriesPer100g) || caloriesPer100g < 0) {
      errorMessage.value = 'Calories per 100 g must be a valid non-negative number.'
      return
    }
  } else if (!Number.isFinite(calories) || calories < 0) {
    errorMessage.value = 'Calories must be a valid non-negative number.'
    return
  }

  store.addSuggestion({
    name,
    amount,
    calories: draftUsePer100g.value ? Math.round(caloriesPer100g) : Math.round(calories),
    usePer100g: draftUsePer100g.value,
    caloriesPer100g: draftUsePer100g.value ? Math.round(caloriesPer100g) : null
  })

  $q.notify({ type: 'positive', message: 'Suggestion added.' })
  goBack()
}

function goBack() {
  clearFlow()
  router.push('/suggestions')
}
</script>
