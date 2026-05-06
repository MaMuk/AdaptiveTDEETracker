import { OpenAiMealRecognitionProvider } from './openAiMealRecognitionProvider'

export function createAiMealRecognitionService(options = {}) {
  const providerName = String(options.provider || 'openai')

  if (providerName === 'openai') {
    return new OpenAiMealRecognitionProvider()
  }

  throw new Error(`Unsupported AI recognition provider: ${providerName}`)
}
