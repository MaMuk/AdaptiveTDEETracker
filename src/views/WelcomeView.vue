<template>
  <q-page
    padding
    class="welcome-page"
  >
    <q-card>
      <q-card-section>
        <div class="text-h5">
          Welcome to Adaptive TDEE Tracker
        </div>
        <div class="text-body2 q-mt-sm">
          This app helps you log daily weight and calories, estimate your maintenance calories (TDEE), and derive a practical calorie target toward your goal.
        </div>
        <div class="text-body2 q-mt-sm">
          Typical use: log each day, review the estimate, optionally use Diary for meal-level tracking, and adjust settings as your routine changes.
        </div>
        <div class="text-subtitle1 q-mt-md q-mb-sm">
          Tips for Best Results
        </div>
        <ul class="text-body2 q-pl-md q-mt-none q-mb-none">
          <li>
            <strong>Consistency is Key:</strong> Log your data daily for the most accurate TDEE calculations
          </li>
          <li>
            <strong>Weigh at the Same Time:</strong> Weight fluctuates throughout the day; weigh yourself at the same time daily (preferably in the morning)
          </li>
          <li>
            <strong>Be Patient:</strong> The TDEE calculation becomes more accurate as you accumulate more data
          </li>
          <li>
            <strong>Track Honestly:</strong> Accurate calorie logging leads to accurate estimates
          </li>
        </ul>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">
          Health and nutrition disclaimer
        </div>
        <div class="disclaimer-text text-caption">
          This app is a personal logging and estimation tool. It is not medical advice, nutritional advice, diagnosis, treatment, or a substitute for care from a licensed physician, dietitian, nutritionist, or other qualified health professional. Calorie, weight, and expenditure estimates are inherently imprecise and may be inaccurate because of food-label variation, measurement error, device limitations, metabolic differences, water-weight changes, illness, medication, hormonal fluctuation, and ordinary day-to-day biological variation. Do not use this app to diagnose, treat, manage, or worsen any medical condition, eating disorder, obesity, underweight condition, pregnancy-related issue, diabetes, or other health concern. Consult a qualified professional before changing diet, weight, exercise, medication, or health routines. Stop using the app and seek professional help if tracking causes distress, restrictive behavior, bingeing, purging, compulsive weighing, rapid weight change, or other harmful behavior.
        </div>
        <q-toggle
          v-model="readAndUnderstood"
          class="q-mt-md"
          color="primary"
          label="Read and understood"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          label="Skip Tour"
          class="bg-grey text-white"
          :disable="!readAndUnderstood"
          @click="skipTour"
        />
        <q-btn
          label="Start Tour"
          color="primary"
          :disable="!readAndUnderstood"
          @click="startTour"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const store = useUserStore()
const readAndUnderstood = ref(false)

async function skipTour() {
  store.setDisclaimerAccepted(true)
  await router.replace('/')
}

async function startTour() {
  store.setDisclaimerAccepted(true)
  await router.replace({ path: '/', query: { startTour: '1' } })
}
</script>

<style scoped>
.welcome-page {
  max-width: 760px;
  margin: 0 auto;
}

.disclaimer-text {
  white-space: pre-wrap;
}
</style>
