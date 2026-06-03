import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { preprocessImageDataUrl } from '../services/aiMealRecognition/imagePreprocessing'

export function useAiImageAcquisition({
  isBusy,
  onError,
  onWarning,
  onAfterImageSelected,
  maxSelectedImages,
  appendOnCameraCapture
}) {
  const cameraInputRef = ref(null)
  const galleryInputRef = ref(null)
  const selectedImageDataUrl = ref('')
  const selectedImageDataUrls = ref([])
  const isOpeningCamera = ref(false)

  function clearTransientImageData() {
    selectedImageDataUrl.value = ''
    selectedImageDataUrls.value = []
  }

  function removeSelectedImageAt(index) {
    const idx = Number(index)
    if (!Number.isInteger(idx) || idx < 0 || idx >= selectedImageDataUrls.value.length) return
    selectedImageDataUrls.value.splice(idx, 1)
    selectedImageDataUrl.value = selectedImageDataUrls.value[0] || ''
  }

  function onImageSelected(file, { append = false } = {}) {
    if (typeof onError === 'function') onError('')
    if (typeof onAfterImageSelected === 'function') onAfterImageSelected()

    if (!file) {
      if (!append) clearTransientImageData()
      selectedImageDataUrl.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const maxImages = Number(maxSelectedImages?.value ?? maxSelectedImages)
      if (!append) {
        selectedImageDataUrls.value = dataUrl ? [dataUrl] : []
      } else if (dataUrl) {
        if (Number.isFinite(maxImages) && maxImages > 0 && selectedImageDataUrls.value.length >= maxImages) {
          selectedImageDataUrl.value = selectedImageDataUrls.value[0] || ''
          return
        }
        selectedImageDataUrls.value.push(dataUrl)
      }
      selectedImageDataUrl.value = selectedImageDataUrls.value[0] || ''
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
        const captured = await tryCaptureWithCapacitorCamera({
          append: Boolean(appendOnCameraCapture?.value ?? appendOnCameraCapture)
        })
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
    const files = Array.from(event?.target?.files || [])
    const shouldAppend = event?.target?.hasAttribute('multiple')
    const maxImages = Number(maxSelectedImages?.value ?? maxSelectedImages)
    if (files.length === 0) {
      onImageSelected(null, { append: shouldAppend })
    } else {
      files.forEach((file, index) => {
        if (
          shouldAppend
          && Number.isFinite(maxImages)
          && maxImages > 0
          && selectedImageDataUrls.value.length >= maxImages
        ) return
        onImageSelected(file, { append: shouldAppend || index > 0 })
      })
    }
    if (event?.target) {
      event.target.value = ''
    }
  }

  async function tryCaptureWithCapacitorCamera(options = {}) {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      })
      const resolvedDataUrl = await resolvePhotoToDataUrl(photo)
      if (resolvedDataUrl) {
        onImageSelected(dataUrlToFile(resolvedDataUrl, 'camera-photo.jpg'), {
          append: Boolean(options.append)
        })
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

  async function getPreprocessedSelectedImages(options = { maxDimension: 1024, quality: 0.75 }) {
    const urls = Array.isArray(selectedImageDataUrls.value) ? selectedImageDataUrls.value : []
    if (urls.length === 0) return []
    const processed = await Promise.all(urls.map(async (dataUrl) => {
      try {
        return await preprocessImageDataUrl(dataUrl, options)
      } catch {
        return null
      }
    }))
    return processed.filter(item => item?.dataUrl)
  }

  return {
    cameraInputRef,
    galleryInputRef,
    selectedImageDataUrl,
    selectedImageDataUrls,
    isOpeningCamera,
    clearTransientImageData,
    removeSelectedImageAt,
    onFileInputChange,
    openCameraPicker,
    openGalleryPicker,
    getPreprocessedSelectedImage,
    getPreprocessedSelectedImages
  }
}
