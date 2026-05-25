<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <router-view />
    </q-page-container>
    <q-footer
      v-if="!isOnboardingRoute"
      elevated
      class="bg-primary text-white"
      data-tour="footer"
    >
      <q-toolbar>
        <q-btn
          data-tour="footer-tracker"
          dense
          text-color="accent"
          icon="home"
          to="/"
        />
        <q-space v-if="store.foodDiaryEnabled" />
        <q-btn
          v-if="store.foodDiaryEnabled"
          data-tour="footer-diary"
          dense
          text-color="accent"
          icon="event_note"
          to="/diary"
        />
        <q-space />
        <q-btn
          data-tour="footer-statistics"
          dense
          text-color="accent"
          icon="insert_chart"
          to="/statistics"
        />
        <q-space v-if="store.foodDiaryEnabled" />
        <q-btn
          v-if="store.foodDiaryEnabled"
          data-tour="footer-suggestions"
          dense
          text-color="accent"
          icon="history"
          to="/suggestions"
        />
        <q-space />
        <q-btn
          data-tour="footer-settings"
          dense
          text-color="accent"
          icon="settings"
          to="/settings"
        />
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { startGuidedProductTour } from './services/guidedTour'

const store = useUserStore()
const route = useRoute()
const router = useRouter()
const isOnboardingRoute = computed(() => route.name === 'Onboarding')

watch(
  () => route.query.startTour,
  async (value) => {
    if (value !== '1') return
    const nextQuery = { ...route.query }
    delete nextQuery.startTour
    await router.replace({ path: route.path, query: nextQuery })
    await startGuidedProductTour({
      router,
      store,
      onFinish: () => {
        store.setGuidedTourCompleted(true)
      }
    })
  },
  { immediate: true }
)
</script>
