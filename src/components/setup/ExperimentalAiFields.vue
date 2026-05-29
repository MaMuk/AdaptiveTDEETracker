<template>
  <div class="text-caption q-mb-sm">
    Experimental feature. Meal image is sent directly to OpenAI using your own API key.
  </div>
  <div
    v-if="!foodDiaryEnabled"
    class="text-caption text-grey-7 q-mb-sm"
  >
    Enable Food Diary to use this feature.
  </div>
  <q-toggle
    :model-value="aiEnabled"
    label="Activate experimental AI recognition"
    color="primary"
    :disable="!foodDiaryEnabled"
    @update:model-value="emit('update:aiEnabled', Boolean($event))"
  />
  <q-input
    v-if="aiEnabled"
    :model-value="openAiApiKey"
    type="password"
    label="OpenAI API key"
    filled
    class="q-mt-sm"
    autocomplete="off"
    hint="Stored locally on this device."
    :disable="!foodDiaryEnabled"
    @update:model-value="emit('update:openAiApiKey', String($event || ''))"
  />
  <q-banner
    v-if="showOpenAiPrivacyWarning"
    dense
    rounded
    class="bg-warning text-black q-mt-sm"
  >
    Privacy warning: when AI mode is enabled with an OpenAI API key, meal data and images are sent to OpenAI and may be stored/retained by OpenAI according to your account settings and OpenAI policies.
  </q-banner>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  foodDiaryEnabled: { type: Boolean, default: false },
  aiEnabled: { type: Boolean, default: false },
  openAiApiKey: { type: String, default: '' }
})

const showOpenAiPrivacyWarning = computed(
  () => props.aiEnabled && props.openAiApiKey.trim().length > 0
)

const emit = defineEmits([
  'update:aiEnabled',
  'update:openAiApiKey'
])
</script>
