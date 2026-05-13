<template>
  <q-page padding>
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Data Import / Export
        </div>
        <div class="text-caption q-mt-xs">
          Export all data by default, or target specific sections. Imports only modify selected sections.
        </div>
      </q-card-section>
      <q-card-actions align="left">
        <q-btn
          flat
          icon="arrow_back"
          label="Back to Settings"
          @click="router.push('/settings')"
        />
      </q-card-actions>
    </q-card>

    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Export
        </div>
        <div class="text-caption q-mb-sm">
          Default is all sections.
        </div>
        <q-toggle
          v-for="section in sections"
          :key="`export-${section.key}`"
          v-model="exportSelection[section.key]"
          :label="section.label"
          class="q-mb-xs"
        />
      </q-card-section>
      <q-card-actions>
        <q-btn
          color="primary"
          label="Export JSON"
          @click="exportJson"
        />
      </q-card-actions>
    </q-card>

    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">
          Import
        </div>
        <q-file
          v-model="importFile"
          filled
          label="Select JSON backup"
          accept="application/json,.json"
          class="q-mb-sm"
          @update:model-value="onFileSelected"
        />
        <div
          v-if="importError"
          class="text-negative text-caption q-mb-sm"
        >
          {{ importError }}
        </div>

        <div v-if="availableImportSections.length > 0">
          <div class="text-caption q-mb-sm">
            Choose sections to import (only selected sections are modified):
          </div>
          <q-toggle
            v-for="section in availableImportSections"
            :key="`import-${section.key}`"
            v-model="importSelection[section.key]"
            :label="section.label"
            class="q-mb-xs"
          />
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn
          color="positive"
          label="Import Selected"
          :disable="!canImport"
          @click="confirmImport"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { useUserStore } from '../stores/user'
import { todayKey } from '../utils/dateKey'

const router = useRouter()
const $q = useQuasar()
const store = useUserStore()

const sections = [
  { key: 'profile', label: 'Profile & core settings' },
  { key: 'logs', label: 'Logs' },
  { key: 'foodDiary', label: 'Food Diary' },
  { key: 'foodSuggestions', label: 'Food Suggestions' },
  { key: 'appSettings', label: 'App Settings' }
]

const exportSelection = ref(sections.reduce((acc, section) => {
  acc[section.key] = true
  return acc
}, {}))

const importSelection = ref(sections.reduce((acc, section) => {
  acc[section.key] = false
  return acc
}, {}))

const importFile = ref(null)
const importPayload = ref(null)
const importError = ref('')

const availableImportSections = computed(() => {
  const sourceSections = importPayload.value?.sections && typeof importPayload.value.sections === 'object'
    ? importPayload.value.sections
    : (importPayload.value || {})
  return sections.filter(section => sourceSections[section.key] && typeof sourceSections[section.key] === 'object')
})

const canImport = computed(() => {
  if (!importPayload.value) return false
  return availableImportSections.value.some(section => importSelection.value[section.key])
})

function selectedKeys(selectionRef) {
  return sections
    .filter(section => Boolean(selectionRef.value[section.key]))
    .map(section => section.key)
}

async function exportJson() {
  const selected = selectedKeys(exportSelection)
  const payload = store.buildExportPayload(selected.length > 0 ? selected : store.exportSectionKeys)
  const jsonText = JSON.stringify(payload, null, 2)
  const date = todayKey()
  const filename = `tdee-backup-${date}.json`

  try {
    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.writeFile({
        path: filename,
        data: jsonText,
        directory: Directory.Cache,
        encoding: 'utf8',
        recursive: true
      })
      await Share.share({
        title: 'Export TDEE backup',
        text: 'TDEE backup JSON',
        files: [result.uri],
        dialogTitle: 'Export backup'
      })
      $q.notify({ type: 'positive', message: 'Export ready. Choose where to save/share it.' })
      return
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Native export failed.' })
    return
  }

  const blob = new Blob([jsonText], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: 'Export created.' })
}

async function onFileSelected(file) {
  importError.value = ''
  importPayload.value = null

  for (const section of sections) {
    importSelection.value[section.key] = false
  }

  if (!file) return

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    importPayload.value = parsed

    for (const section of availableImportSections.value) {
      importSelection.value[section.key] = true
    }
  } catch {
    importError.value = 'Invalid JSON file.'
  }
}

function confirmImport() {
  if (!canImport.value) return
  const sectionsToImport = selectedKeys(importSelection)
  $q.dialog({
    title: 'Import Data',
    message: 'Selected sections will be replaced with the file content. Unselected sections are unchanged.',
    persistent: true,
    ok: { label: 'Import', color: 'positive' },
    cancel: { label: 'Cancel', color: 'primary' }
  }).onOk(() => {
    const result = store.importFromPayload(importPayload.value, sectionsToImport)
    if (!result.importedSections.length) {
      $q.notify({ type: 'warning', message: 'No matching sections found in file.' })
      return
    }
    $q.notify({
      type: 'positive',
      message: `Imported: ${result.importedSections.join(', ')}`
    })
  })
}
</script>
