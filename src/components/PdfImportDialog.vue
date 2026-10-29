<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProgramStore, normalizeProgram } from '@/stores/program'
import { useUiStore } from '@/stores/ui'
import type { ParseBlock, ParseResult } from '@/parser/ecamp'
import type { Block, Program } from '@/types'
import { midDate, minutesToTime, timeToMinutes } from '@/utils/time'
import { newId } from '@/utils/id'
import { textColor } from '@/utils/file'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ targetProgram?: string }>()
const store = useProgramStore()
const ui = useUiStore()
const router = useRouter()

type Step = 'file' | 'loading' | 'preview'
const step = ref<Step>('file')
const error = ref('')
const dragging = ref(false)
const fileName = ref('')
const result = ref<ParseResult | null>(null)
const blocks = ref<(ParseBlock & { key: number })[]>([])
const meta = ref({ name: '', group: '', motto: '', location: '', lead: '', coach: '' })
const target = ref<string>('new')
const shift = ref(0)
const input = ref<HTMLInputElement>()

watch(open, (o) => {
  if (o) {
    step.value = 'file'
    error.value = ''
    result.value = null
    blocks.value = []
    shift.value = 0
    target.value = props.targetProgram ?? 'new'
  }
})

const targetOptions = computed(() => [
  { title: 'Als neues Programm anlegen', value: 'new' },
  ...store.programs.map((p) => ({ title: `In «${p.name}» übernehmen`, value: p.id })),
])

const byDay = computed(() => {
  const map = new Map<string, (ParseBlock & { key: number })[]>()
  for (const b of blocks.value) {
    if (!map.has(b.date)) map.set(b.date, [])
    map.get(b.date)!.push(b)
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
})

const categories = computed(() => result.value?.categories ?? [])
function categoryColor(short?: string) {
  return categories.value.find((k) => k.short === short)?.color ?? '#BBBBBB'
}

async function fileChosen(f: File | undefined | null) {
  if (!f) return
  if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
    error.value = 'Bitte eine PDF-Datei wählen.'
    return
  }
  error.value = ''
  fileName.value = f.name
  step.value = 'loading'
  try {
    const { programFromPdf } = await import('@/parser/load')
    const r = await programFromPdf(f)
    if (!r.blocks.length) {
      error.value =
        'In diesem PDF wurde kein Grobprogramm gefunden. Unterstützt wird der Export «Grobprogramm» aus eCamp v3.'
      step.value = 'file'
      return
    }
    result.value = r
    blocks.value = r.blocks.map((b, i) => ({ ...b, key: i }))
    const name = [r.campName, r.section].filter(Boolean).join(' – ') || f.name.replace(/\.pdf$/i, '')
    meta.value = {
      name,
      group: r.group ?? '',
      motto: r.motto ?? '',
      location: r.location ?? '',
      lead: r.lead ?? '',
      coach: r.coach ?? '',
    }
    step.value = 'preview'
  } catch (e) {
    console.error(e)
    error.value = 'Das PDF konnte nicht gelesen werden.'
    step.value = 'file'
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  fileChosen(e.dataTransfer?.files?.[0])
}

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  fileChosen(el.files?.[0])
  el.value = ''
}

function setTime(b: ParseBlock, field: 'start' | 'end', value: string) {
  const m = timeToMinutes(value)
  if (m === null) return
  // Zeiten nach Mitternacht bleiben dem Vortag zugeordnet
  const base = b[field] >= 1440 || (field === 'end' && m < b.start) ? 1440 : 0
  b[field] = m + base
}

function removeRow(key: number) {
  blocks.value = blocks.value.filter((b) => b.key !== key)
}

function rowKey(b: { date: string; number?: string; title: string }) {
  return b.number ? `${b.date}|${b.number}` : `${b.date}|t:${b.title.toLowerCase()}`
}

function apply() {
  const r = result.value
  if (!r) return
  const offset = Math.round(shift.value * 60)
  const imported: Block[] = blocks.value.map((b) => ({
    id: newId(),
    date: b.date,
    start: b.start + offset,
    end: b.end + offset,
    number: b.number,
    category: b.category,
    title: b.title,
    responsible: b.responsible,
    relationships: [],
    methods: [],
    subPoints: [],
  }))

  if (target.value === 'new') {
    const p = store.newProgram({
      ...meta.value,
      categories: r.categories.length ? r.categories : undefined,
      days: r.days,
    })
    p.blocks.push(...imported)
    store.replaceProgram(normalizeProgram(JSON.parse(JSON.stringify(p)))!)
    ui.notify(`${imported.length} Blöcke importiert.`)
  } else {
    // Bestehendes Programm: Zuweisungen gleicher Blöcke behalten
    const old = store.programs.find((p) => p.id === target.value)
    if (!old) return
    const copy: Program = JSON.parse(JSON.stringify(old))
    const oldByKey = new Map(copy.blocks.map((b) => [rowKey(b), b]))
    let kept = 0
    for (const b of imported) {
      const previous = oldByKey.get(rowKey(b))
      if (previous) {
        b.id = previous.id
        b.relationships = previous.relationships
        b.methods = previous.methods
        b.subPoints = previous.subPoints
        b.notes = previous.notes
        b.location = previous.location
        if (b.relationships.length || b.methods.length) kept++
      }
    }
    const newDays = new Set(imported.map((b) => b.date))
    copy.blocks = [...copy.blocks.filter((b) => !newDays.has(b.date)), ...imported]
    for (const k of r.categories) if (!copy.categories.some((x) => x.short === k.short)) copy.categories.push(k)
    for (const t of r.days) {
      const existing = copy.days.find((x) => x.date === t.date)
      if (existing) existing.responsible = t.responsible ?? existing.responsible
      else copy.days.push(t)
    }
    copy.modified = new Date().toISOString()
    store.replaceProgram(normalizeProgram(copy)!)
    ui.notify(`${imported.length} Blöcke übernommen, bei ${kept} blieben die Zuweisungen erhalten.`)
  }
  open.value = false
  router.push({ name: 'calendar' })
  ui.calendarMode = 'all'
}
</script>

<template>
  <v-dialog v-model="open" :max-width="step === 'preview' ? 1100 : 620" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center pt-4">
        <v-icon icon="mdi-file-pdf-box" color="primary" class="mr-2" />
        Grobprogramm importieren
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="open = false" />
      </v-card-title>

      <v-card-text v-if="step !== 'preview'">
        <div
          class="dropzone"
          :class="{ aktiv: dragging }"
          role="button"
          tabindex="0"
          @click="input?.click()"
          @keydown.enter="input?.click()"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
        >
          <template v-if="step === 'loading'">
            <v-progress-circular indeterminate color="primary" size="40" />
            <div class="mt-3">«{{ fileName }}» wird gelesen …</div>
          </template>
          <template v-else>
            <v-icon icon="mdi-tray-arrow-up" size="44" color="primary" />
            <div class="text-subtitle-1 mt-2 font-weight-medium">PDF hierher ziehen oder klicken</div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              eCamp v3 → Drucken → «Grobprogramm». Der alte und der neue Druck werden beide erkannt.
            </div>
          </template>
          <input ref="input" type="file" accept="application/pdf,.pdf" hidden @change="onInput" />
        </div>
        <v-alert v-if="error" type="error" variant="tonal" class="mt-4" density="compact">{{ error }}</v-alert>
      </v-card-text>

      <template v-else-if="result">
        <v-card-text class="pt-2">
          <v-alert
            v-for="w in result.warnings"
            :key="w"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
            >{{ w }}</v-alert
          >
          <v-row dense>
            <v-col cols="12" md="5">
              <v-select v-model="target" :items="targetOptions" label="Ziel" />
            </v-col>
            <v-col cols="12" md="7">
              <v-text-field v-model="meta.name" label="Name des Programms" :disabled="target !== 'new'" />
            </v-col>
            <template v-if="target === 'new'">
              <v-col cols="12" sm="6" md="3"><v-text-field v-model="meta.group" label="Abteilung" /></v-col>
              <v-col cols="12" sm="6" md="3"><v-text-field v-model="meta.motto" label="Motto" /></v-col>
              <v-col cols="12" sm="6" md="3"><v-text-field v-model="meta.lead" label="Leitung" /></v-col>
              <v-col cols="12" sm="6" md="3"><v-text-field v-model="meta.location" label="Ort" /></v-col>
            </template>
            <v-col v-else cols="12">
              <div class="text-body-2 text-medium-emphasis">
                Blöcke mit gleichem Tag und gleicher Nummer behalten ihre Beziehungen und Methoden. Die Tage aus diesem PDF
                werden ersetzt, andere Tage bleiben unverändert.
              </div>
            </v-col>
          </v-row>

          <div class="d-flex align-center flex-wrap ga-3 mt-4 mb-2">
            <div class="abschnitt-titel mb-0">Erkannte Blöcke ({{ blocks.length }})</div>
            <v-spacer />
            <div class="d-flex align-center ga-2 text-body-2">
              Alle Zeiten verschieben um
              <v-text-field
                v-model.number="shift"
                type="number"
                step="0.5"
                suffix="h"
                density="compact"
                style="max-width: 110px"
              />
            </div>
          </div>
          <div class="tabelle-wrapper">
            <table class="vorschau">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Nr.</th>
                  <th>Kategorie</th>
                  <th>Titel</th>
                  <th>Verantwortlich</th>
                  <th></th>
                </tr>
              </thead>
              <tbody v-for="[date, list] in byDay" :key="date">
                <tr class="tag">
                  <td colspan="6">{{ midDate(date) }}</td>
                </tr>
                <tr v-for="b in list" :key="b.key">
                  <td class="zeit">
                    <input
                      :value="minutesToTime(b.start + shift * 60)"
                      type="time"
                      :disabled="shift !== 0"
                      @change="setTime(b, 'start', ($event.target as HTMLInputElement).value)"
                    />
                    –
                    <input
                      :value="minutesToTime(b.end + shift * 60)"
                      type="time"
                      :disabled="shift !== 0"
                      @change="setTime(b, 'end', ($event.target as HTMLInputElement).value)"
                    />
                  </td>
                  <td><input v-model="b.number" class="nr" /></td>
                  <td>
                    <select
                      v-model="b.category"
                      class="kat"
                      :style="{ background: categoryColor(b.category), color: textColor(categoryColor(b.category)) }"
                    >
                      <option :value="undefined">–</option>
                      <option v-for="k in categories" :key="k.short" :value="k.short">{{ k.short }}</option>
                    </select>
                  </td>
                  <td><input v-model="b.title" class="titel" :class="{ leer: !b.title }" placeholder="Titel fehlt" /></td>
                  <td><input v-model="b.responsible" class="verantw" /></td>
                  <td>
                    <v-btn icon="mdi-delete-outline" size="x-small" variant="text" title="Block entfernen" @click="removeRow(b.key)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-6 py-3">
          <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="step = 'file'">Andere Datei</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="open = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-check" @click="apply">Übernehmen</v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dropzone {
  border: 2px dashed #c4a4c2;
  border-radius: 12px;
  padding: 40px 16px;
  text-align: center;
  cursor: pointer;
  background: #faf6f9;
  transition: background 0.15s, border-color 0.15s;
}
.dropzone:hover,
.dropzone.aktiv {
  background: #f3e9f0;
  border-color: var(--brombeer);
}
.tabelle-wrapper {
  overflow-x: auto;
  border: 1px solid var(--linie);
  border-radius: 8px;
}
.vorschau {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.vorschau th {
  text-align: left;
  font-weight: 600;
  padding: 6px 8px;
  background: #f6f2f5;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}
.vorschau td {
  padding: 2px 8px;
  border-top: 1px solid #f0eaee;
  white-space: nowrap;
}
.vorschau tr.tag td {
  background: #efe6ec;
  font-weight: 600;
  color: var(--brombeer-dunkel);
  padding: 4px 8px;
}
.vorschau input,
.vorschau select {
  font: inherit;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 2px 4px;
  background: transparent;
}
.vorschau input:hover,
.vorschau input:focus {
  border-color: #d9cdd6;
  outline: none;
  background: #fff;
}
.vorschau input.nr {
  width: 52px;
}
.vorschau input.titel {
  width: 100%;
  min-width: 260px;
}
.vorschau input.titel.leer {
  border-color: #e59155;
}
.vorschau input.verantw {
  width: 180px;
}
.vorschau select.kat {
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.8rem;
}
.zeit input {
  width: 84px;
}
</style>
