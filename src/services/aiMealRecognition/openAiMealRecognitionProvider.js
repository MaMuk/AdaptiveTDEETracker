import { AiMealRecognitionProvider } from './aiMealRecognitionProvider'
import { sanitizeRecognitionResult } from './types'

const OPENAI_PROVIDER = 'openai'

export class OpenAiMealRecognitionProvider extends AiMealRecognitionProvider {
  constructor() {
    super(OPENAI_PROVIDER)
  }

  async recognizeMealFromImage(input) {
    const apiKey = String(input?.apiKey || '').trim()
    const imageDataUrl = String(input?.imageDataUrl || '')
    const prompt = buildPrompt({
      context: input?.context,
      isNutritionLabel: Boolean(input?.isNutritionLabel)
    })

    if (!imageDataUrl) {
      throw new Error('No image selected.')
    }

    if (!apiKey) {
      return sanitizeRecognitionResult({
        guesses: [
          {
            name: 'Double cheeseburger with two beef patties and cheese',
            calories: { low: 450, estimate: 520, high: 600 },
            confidence: 'high'
          },
          {
            name: 'Cheeseburger with a beef patty and cheese slice',
            calories: { low: 300, estimate: 380, high: 450 },
            confidence: 'medium'
          },
          {
            name: 'Cheeseburger with added grilled onions',
            calories: { low: 320, estimate: 400, high: 480 },
            confidence: 'medium'
          }
        ]
      }, 'openai-demo')
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl }
            ]
          }
        ],
        max_output_tokens: 300
      })
    })

    if (!response.ok) {
      let message = `OpenAI request failed (${response.status}).`
      try {
        const body = await response.json()
        if (body?.error?.message) {
          message = body.error.message
        }
      } catch {
        // Keep fallback message.
      }
      throw new Error(message)
    }

    const payload = await response.json()
    const outputText = extractOutputText(payload)

    if (!outputText) {
      throw new Error('AI provider returned an empty response.')
    }

    let parsed
    try {
      parsed = JSON.parse(outputText)
    } catch {
      throw new Error('AI provider response was not valid JSON.')
    }

    const sanitized = sanitizeRecognitionResult(parsed, OPENAI_PROVIDER)
    if (sanitized.guesses.length === 0) {
      throw new Error('AI provider returned no usable meal guesses.')
    }

    return sanitized
  }
}

function buildPrompt(options = {}) {
  const context = options.context === 'suggestions' ? 'suggestions' : 'diary'
  const isNutritionLabel = Boolean(options.isNutritionLabel)

  const base = [
    'Estimate calories from this food photo for a calorie-only TDEE app.',
    'Return strict JSON only with this exact shape:',
    '{"guesses":[{"name":"string","calories":{"low":number,"estimate":number,"high":number},"confidence":"low|medium|high"}]}.',
    'Provide up to 4 plausible guesses.',
    'Avoid fake precision. Keep ranges realistic.',
    'No macros. No explanation text.'
  ]

  if (context === 'diary') {
    base.push('Bias toward realistic restaurant-style preparation when uncertain.')
  }

  if (context === 'suggestions') {
    base.push('This is for a reusable food suggestion table, not an immediate diary meal.')
    base.push('Recognize generic products and packaged foods when visible.')
  }

  if (isNutritionLabel) {
    base.push('Focus on reading nutrition-label calories and packaged product cues.')
    base.push('If product name is unclear, use "Unnamed product" as the name.')
  }

  return base.join(' ')
}

function extractOutputText(payload) {
  const topLevelText = String(payload?.output_text || '').trim()
  if (topLevelText) return topLevelText

  const outputItems = Array.isArray(payload?.output) ? payload.output : []
  for (const item of outputItems) {
    const contents = Array.isArray(item?.content) ? item.content : []
    for (const contentItem of contents) {
      if (contentItem?.type === 'output_text') {
        const text = String(contentItem?.text || '').trim()
        if (text) return text
      }
    }
  }

  return ''
}
