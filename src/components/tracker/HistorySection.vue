<template>
  <section>
    <div class="history-header row items-center justify-between q-mb-sm">
      <div
        class="text-h6"
        data-tour="history-section"
      >
        History
      </div>
      <q-btn-toggle
        v-model="mode"
        no-caps
        unelevated
        rounded
        toggle-color="primary"
        color="white"
        text-color="primary"
        class="history-toggle"
        :options="[
          { label: 'List', value: 'list', icon: 'view_list' },
          { label: 'Grid', value: 'grid', icon: 'table_view' }
        ]"
      />
    </div>

    <transition
      name="history-switch"
      mode="out-in"
    >
      <HistoryList
        v-if="mode === 'list'"
        key="list"
        :logs="logs"
        :format-date="formatDate"
        :format-body-weight="formatBodyWeight"
        :tour-mock-entry="tourMockEntry"
        :is-tour-mock-mode="isTourMockMode"
        @select-date="$emit('select-date', $event)"
        @delete-date="$emit('delete-date', $event)"
      />
      <HistoryGrid
        v-else
        key="grid"
        :logs="logs"
        :selected-date="selectedDate"
        :format-date="formatDate"
        :format-body-weight="formatBodyWeight"
        @select-date="$emit('select-date', $event)"
      />
    </transition>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import HistoryGrid from './HistoryGrid.vue'
import HistoryList from './HistoryList.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'list'
  },
  logs: {
    type: Array,
    default: () => []
  },
  selectedDate: {
    type: String,
    default: ''
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

const emit = defineEmits(['select-date', 'delete-date', 'update:modelValue'])

const mode = computed({
  get: () => (props.modelValue === 'grid' ? 'grid' : 'list'),
  set: (value) => {
    emit('update:modelValue', value === 'grid' ? 'grid' : 'list')
  }
})
</script>

<style scoped>
.history-toggle {
  background: #eef3ff;
  border: 1px solid #b8c7ea;
  padding: 2px;
}

.history-toggle :deep(.q-btn) {
  min-height: 30px;
}

.history-toggle :deep(.q-btn--active) {
  box-shadow: 0 1px 4px rgba(50, 87, 167, 0.26);
}

.history-switch-enter-active,
.history-switch-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.history-switch-enter-from,
.history-switch-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
