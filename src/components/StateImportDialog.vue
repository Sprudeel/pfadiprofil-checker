<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProgramStore } from '@/stores/program'
import { useUiStore } from '@/stores/ui'

const open = defineModel<boolean>({ required: true })
const store = useProgramStore()
const ui = useUiStore()
const router = useRouter()

const file = ref<File | File[] | null>(null)
const mode = ref<'add' | 'replace'>('add')
const error = ref('')

watch(open, (o) => {
  if (o) {
    file.value = null
    error.value = ''
    mode.value = store.programs.length ? 'add' : 'replace'
  }
})

async function importFile() {
  const f = Array.isArray(file.value) ? file.value[0] : file.value
  if (!f) return
  const text = await f.text()
  const r = store.importState(text, mode.value)
  if (r.error) {
    error.value = r.error
    return
  }
  open.value = false
  ui.notify(`${r.count} Programm${r.count === 1 ? '' : 'e'} importiert.`)
  if (r.count) router.push({ name: 'calendar' })
}
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card>
      <v-card-title class="pt-4">Stand importieren</v-card-title>
      <v-card-text class="d-flex flex-column ga-4">
        <p class="text-medium-emphasis">
          Lade eine JSON-Datei, die du vorher mit «Stand exportieren» heruntergeladen hast.
        </p>
        <v-file-input v-model="file" accept=".json,application/json" label="JSON-Datei" prepend-icon="" prepend-inner-icon="mdi-code-json" />
        <v-radio-group v-model="mode" hide-details>
          <v-radio value="add" label="Zu den bestehenden Programmen hinzufügen" />
          <v-radio value="replace" label="Alles ersetzen (bestehende Programme werden gelöscht)" />
        </v-radio-group>
        <v-alert v-if="error" type="error" variant="tonal" density="compact">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="open = false">Abbrechen</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!file" @click="importFile">Importieren</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
