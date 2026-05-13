import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { preprocessImageDataUrl } from '../services/aiMealRecognition/imagePreprocessing'

export function useAiImageAcquisition({
  isBusy,
  onError,
  onWarning,
  onAfterImageSelected
}) {
  const cameraInputRef = ref(null)
  const galleryInputRef = ref(null)
  const selectedImageDataUrl = ref('')
  const isOpeningCamera = ref(false)

  function clearTransientImageData() {
    selectedImageDataUrl.value = ''
  }

  function onImageSelected(file) {
    if (typeof onError === 'function') onError('')
    if (typeof onAfterImageSelected === 'function') onAfterImageSelected()

    if (!file) {
      selectedImageDataUrl.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      selectedImageDataUrl.value = String(reader.result || '')
    }
    reader.onerror = () => {
      if (typeof onError === 'function') onError('Could not read selected image.')
    }
    reader.readAsDataURL(file)
  }

  async function openCameraPicker() {
    if (isOpeningCamera.value || (isBusy?.value ?? false)) return
    isOpeningCamera.value = true
    if (typeof onWarning === 'function') onWarning('')

    try {
      if (Capacitor.isPluginAvailable('Camera')) {
        const captured = await tryCaptureWithCapacitorCamera()
        if (!captured && typeof onWarning === 'function') {
          onWarning('No photo captured.')
        }
        return
      }

      if (typeof onWarning === 'function') {
        onWarning('Direct camera capture plugin is unavailable. Falling back to browser file picker.')
      }
      cameraInputRef.value?.click()
    } catch {
      if (typeof onWarning === 'function') onWarning('Camera action failed.')
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

  async function getPreprocessedSelectedImage(options = { maxDimension: 1024, quality: 0.75 }) {
    if (!selectedImageDataUrl.value) return null
    return await preprocessImageDataUrl(selectedImageDataUrl.value, options)
  }

  return {
    cameraInputRef,
    galleryInputRef,
    selectedImageDataUrl,
    isOpeningCamera,
    clearTransientImageData,
    onFileInputChange,
    openCameraPicker,
    openGalleryPicker,
    getPreprocessedSelectedImage
  }
}
