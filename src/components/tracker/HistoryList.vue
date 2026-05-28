<template>
  <q-list
    bordered
    separator
    class="bg-white rounded-borders history-list"
  >
    <q-item
      v-for="(log, idx) in displayedLogs"
      :key="log.date"
      :data-tour="idx === 0 ? 'history-row-first' : null"
    >
      <q-item-section
        clickable
        @click="$emit('select-date', log.date)"
      >
        <q-item-label>{{ formatDate(log.date) }}</q-item-label>
      </q-item-section>
      <q-item-section
        side
        clickable
        @click="$emit('select-date', log.date)"
      >
        <div class="text-right">
          <div>{{ formatBodyWeight(log.weight) }}</div>
          <div class="text-caption">
            {{ log.calories }} kcal
          </div>
        </div>
      </q-item-section>
      <q-item-section side>
        <q-btn
          :data-tour="idx === 0 ? 'history-delete-first' : null"
          flat
          round
          dense
          icon="delete"
          color="negative"
          aria-label="Delete entry"
          @click.stop="$emit('delete-date', log)"
        />
      </q-item-section>
    </q-item>
    <q-item
      v-if="canLoadMore"
      clickable
      @click="loadMore"
    >
      <q-item-section class="text-center text-primary">
        <q-item-label>Load More</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  },
  formatDate: {
    type: Function,
    required: true
  },
  formatBodyWeight: {
    type: Function,
    required: true
  },
  tourMockEntry: {
    type: Object,
    default: null
  },
  isTourMockMode: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select-date', 'delete-date'])

const historyLimit = ref(14)

const displayedLogs = computed(() => {
  const realLogs = props.logs.slice(0, historyLimit.value)
  if (realLogs.length === 0 && props.isTourMockMode && props.tourMockEntry) return [props.tourMockEntry]
  return realLogs
})

const canLoadMore = computed(() => props.logs.length > historyLimit.value)

function loadMore() {
  historyLimit.value += 7
}
</script>

<style scoped>
.history-list :deep(.q-item) {
  min-height: 42px;
  padding-top: 6px;
  padding-bottom: 6px;
}

.history-list :deep(.q-item__label) {
  font-size: 0.92rem;
}

@media (max-width: 600px) {
  .history-list :deep(.q-item) {
    min-height: 38px;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .history-list :deep(.q-item__label) {
    font-size: 0.84rem;
  }
}
</style>
