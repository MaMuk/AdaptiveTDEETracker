function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode selected image.'))
    image.src = dataUrl
  })
}

export async function preprocessImageDataUrl(dataUrl, options = {}) {
  if (!dataUrl) {
    throw new Error('No image selected.')
  }

  const maxDimension = Number(options.maxDimension) || 1024
  const quality = Number(options.quality) || 0.75

  const source = await loadImageFromDataUrl(dataUrl)
  const sourceWidth = source.naturalWidth || source.width
  const sourceHeight = source.naturalHeight || source.height
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))

  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image compression is not available in this environment.')
  }

  context.drawImage(source, 0, 0, width, height)
  const outputDataUrl = canvas.toDataURL('image/jpeg', quality)

  return {
    dataUrl: outputDataUrl,
    width,
    height,
    mimeType: 'image/jpeg'
  }
}
