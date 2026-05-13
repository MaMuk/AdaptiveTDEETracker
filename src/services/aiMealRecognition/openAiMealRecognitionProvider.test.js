import assert from 'node:assert/strict'
import { OpenAiMealRecognitionProvider } from './openAiMealRecognitionProvider.js'

function createJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body
    }
  }
}

async function withMockedFetch(mockImpl, fn) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mockImpl
  try {
    await fn()
  } finally {
    globalThis.fetch = originalFetch
  }
}

async function testUsesJsonSchemaRequestFormat() {
  const provider = new OpenAiMealRecognitionProvider()
  let capturedBody = null

  await withMockedFetch(async (_url, options) => {
    capturedBody = JSON.parse(options.body)
    return createJsonResponse({
      output: [
        {
          content: [
            {
              type: 'output_json',
              json: {
                guesses: [
                  {
                    name: 'Soup',
                    calories: { low: 100, estimate: 150, high: 220 },
                    caloriesPer100g: 65,
                    confidence: 'high'
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  }, async () => {
    await provider.recognizeMealFromImage({
      apiKey: 'test-key',
      imageDataUrl: 'data:image/png;base64,abc'
    })
  })

  assert.equal(capturedBody.text.format.type, 'json_schema')
  assert.equal(capturedBody.text.format.name, 'meal_recognition_result')
  assert.equal(capturedBody.text.format.strict, true)
  assert.ok(capturedBody.text.format.schema)
}

async function testFallsBackToSanitizedTextParsing() {
  const provider = new OpenAiMealRecognitionProvider()

  await withMockedFetch(async () => createJsonResponse({
    output_text: '```json\n{"guesses":[{"name":"Burger","calories":{"low":350,"estimate":420,"high":500},"caloriesPer100g":255,"confidence":"medium"}]}\n```'
  }), async () => {
    const result = await provider.recognizeMealFromImage({
      apiKey: 'test-key',
      imageDataUrl: 'data:image/png;base64,abc'
    })

    assert.equal(result.guesses.length, 1)
    assert.equal(result.guesses[0].name, 'Burger')
    assert.equal(result.guesses[0].provider, 'openai')
  })
}

async function testRejectsMalformedProviderResponse() {
  const provider = new OpenAiMealRecognitionProvider()

  await withMockedFetch(async () => createJsonResponse({
    output_text: 'not valid json at all'
  }), async () => {
    await assert.rejects(
      () => provider.recognizeMealFromImage({
        apiKey: 'test-key',
        imageDataUrl: 'data:image/png;base64,abc'
      }),
      /AI provider response was not valid JSON\./
    )
  })
}

async function testRejectsNoUsableGuessesFromStructuredOutput() {
  const provider = new OpenAiMealRecognitionProvider()

  await withMockedFetch(async () => createJsonResponse({
    output_parsed: {
      guesses: [
        {
          name: '   ',
          calories: { low: 10, estimate: 20, high: 30 },
          caloriesPer100g: 12,
          confidence: 'medium'
        }
      ]
    }
  }), async () => {
    await assert.rejects(
      () => provider.recognizeMealFromImage({
        apiKey: 'test-key',
        imageDataUrl: 'data:image/png;base64,abc'
      }),
      /AI provider returned no usable meal guesses\./
    )
  })
}

async function run() {
  await testUsesJsonSchemaRequestFormat()
  await testFallsBackToSanitizedTextParsing()
  await testRejectsMalformedProviderResponse()
  await testRejectsNoUsableGuessesFromStructuredOutput()
  console.log('openai meal recognition provider tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
