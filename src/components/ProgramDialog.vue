<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProgramStore, DEFAULT_CATEGORIES } from '@/stores/program'
import { LEVELS } from '@/data/profile'
import type { Category } from '@/types'
import { textColor } from '@/utils/file'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ programId?: string }>()
const emit = defineEmits<{ created: [id: string] }>()
const store = useProgramStore()

const form = ref({
  name: '',
  group: '',
  level: '',
  motto: '',
  location: '',
  lead: '',
  coach: '',
})
const categories = ref<Category[]>([])

watch(open, (o) => {
  if (!o) return
  const p = store.programs.find((x) => x.id === props.programId)
  form.value = {
    name: p?.name ?? '',
    group: p?.group ?? '',
    level: p?.level ?? '',
    motto: p?.motto ?? '',
    location: p?.location ?? '',
    lead: p?.lead ?? '',
    coach: p?.coach ?? '',
  }
  categories.value = JSON.parse(JSON.stringify(p?.categories ?? DEFAULT_CATEGORIES))
})

function save() {
  const data = {
    ...Object.fromEntries(Object.entries(form.value).map(([k, v]) => [k, v.trim() || undefined])),
    name: form.value.name.trim() || 'Programm',
    categories: categories.value.filter((k) => k.short.trim()),
  }
  const p = store.programs.find((x) => x.id === props.programId)
  if (p) {
    Object.assign(p, data)
    store.touch(p)
  } else {
    const created = store.newProgram(data)
    emit('created', created.id)
  }
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="640" scrollable>
    <v-card>
      <v-card-title class="pt-4">{{ programId ? 'Programm bearbeiten' : 'Neues Programm' }}</v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12">
            <v-text-field
              v-model="form.name"
              label="Name"
              placeholder="z.B. Quartalsprogramm Herbst oder Sommerlager"
              autofocus
            />
          </v-col>
          <v-col cols="12" sm="6"><v-text-field v-model="form.group" label="Abteilung / Einheit" /></v-col>
          <v-col cols="12" sm="6"><v-select v-model="form.level" :items="['', ...LEVELS]" label="Stufe" /></v-col>
          <v-col cols="12" sm="6"><v-text-field v-model="form.motto" label="Motto" /></v-col>
          <v-col cols="12" sm="6"><v-text-field v-model="form.location" label="Ort" /></v-col>
          <v-col cols="12" sm="6"><v-text-field v-model="form.lead" label="Leitung" /></v-col>
          <v-col cols="12" sm="6"><v-text-field v-model="form.coach" label="Coach" /></v-col>
        </v-row>

        <div class="abschnitt-titel mt-6">Blockkategorien</div>
        <div v-for="(k, i) in categories" :key="i" class="d-flex align-center ga-2 mb-2">
          <label class="farbe" :style="{ background: k.color, color: textColor(k.color) }" title="Farbe wählen">
            {{ k.short || '?' }}
            <input v-model="k.color" type="color" />
          </label>
          <v-text-field v-model="k.short" label="Kürzel" density="compact" style="max-width: 110px" />
          <v-text-field v-model="k.name" label="Bezeichnung" density="compact" />
          <v-btn icon="mdi-delete-outline" variant="text" size="small" @click="categories.splice(i, 1)" />
        </div>
        <v-btn
          variant="text"
          prepend-icon="mdi-plus"
          size="small"
          @click="categories.push({ short: '', name: '', color: '#90B7E4' })"
        >
          Kategorie hinzufügen
        </v-btn>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="open = false">Abbrechen</v-btn>
        <v-btn color="primary" variant="flat" @click="save">Speichern</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.farbe {
  position: relative;
  min-width: 52px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0 6px;
}
.farbe input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
