import assert from 'node:assert/strict'
import { hasLegacySetupData, resolveSetupCompleted } from './setupCompletion.js'

function installLocalStorageMock(seed = {}) {
  const store = new Map(Object.entries(seed))
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    }
  }
}

function testEmptyStoresDoNotCountAsLegacySetup() {
  installLocalStorageMock({
    tdee_profile_logs_tdee_store: JSON.stringify({
      startWeight: null,
      goalWeight: null,
      height: null,
      logs: []
    })
  })

  assert.equal(hasLegacySetupData(), false)
  assert.equal(resolveSetupCompleted({}), false)
}

function testNumericLegacyDataCountsAsSetup() {
  installLocalStorageMock({
    tdee_profile_logs_tdee_store: JSON.stringify({
      startWeight: '83.5',
      goalWeight: null,
      height: null,
      logs: []
    })
  })

  assert.equal(hasLegacySetupData(), true)
  assert.equal(resolveSetupCompleted({}), true)
}

function testNonProfileStoresDoNotCountAsSetup() {
  installLocalStorageMock({
    tdee_profile_logs_tdee_store: JSON.stringify({
      startWeight: null,
      goalWeight: null,
      height: null,
      logs: []
    }),
    tdee_diary_store: JSON.stringify({ foodDiaryEntries: [{ id: 1 }] }),
    tdee_suggestions_store: JSON.stringify({ foodSuggestions: [{ id: 1 }] }),
    tdee_ai_settings_store: JSON.stringify({ openAiApiKey: 'sk-test' })
  })

  assert.equal(hasLegacySetupData(), false)
  assert.equal(resolveSetupCompleted({}), false)
}

function run() {
  testEmptyStoresDoNotCountAsLegacySetup()
  testNumericLegacyDataCountsAsSetup()
  testNonProfileStoresDoNotCountAsSetup()
  console.log('setupCompletion tests passed')
}

run()
