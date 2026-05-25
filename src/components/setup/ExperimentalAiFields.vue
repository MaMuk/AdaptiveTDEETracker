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
</template>

<script setup>
defineProps({
  foodDiaryEnabled: { type: Boolean, default: false },
  aiEnabled: { type: Boolean, default: false },
  openAiApiKey: { type: String, default: '' }
})

const emit = defineEmits([
  'update:aiEnabled',
  'update:openAiApiKey'
])
</script>
