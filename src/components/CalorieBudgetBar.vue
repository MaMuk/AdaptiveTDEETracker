<template>
  <div class="calorie-budget-bar" :style="{ maxWidth }">
    <q-linear-progress
      :value="progressValue"
      :color="barColor"
      track-color="grey-4"
      rounded
      :size="size"
    />
    <div class="bar-label">{{ labelText }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  consumed: { type: Number, default: 0 },
  target: { type: Number, default: 0 },
  maxWidth: { type: String, default: '280px' },
  size: { type: String, default: '16px' }
})

const progressValue = computed(() => {
  const target = Number(props.target)
  const consumed = Number(props.consumed)
  if (!Number.isFinite(consumed) || consumed <= 0) return 0
  if (!Number.isFinite(target) || target <= 0) return 1
  return Math.min(1, consumed / target)
})

const barColor = computed(() => {
  const consumed = Number(props.consumed)
  const target = Number(props.target)
  if (!Number.isFinite(consumed) || consumed <= 0) return 'grey-4'
  if (!Number.isFinite(target) || target <= 0) return 'red-3'
  if (consumed < target) return 'green-3'
  if (consumed === target) return 'amber-3'
  return 'red-3'
})

const labelText = computed(() => `${Math.round(Number(props.consumed) || 0)}kcal/${Math.round(Number(props.target) || 0)}kcal`)
</script>

<style scoped>
.calorie-budget-bar {
  width: 100%;
  position: relative;
  padding: 2px 0;
}

.bar-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #000;
  text-shadow: 0 0 1px rgba(255, 255, 255, 0.75);
  pointer-events: none;
}
</style>
