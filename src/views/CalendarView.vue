<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useProgramStore } from '@/stores/program'
import { useUiStore, type CalendarMode } from '@/stores/ui'
import { RELATIONSHIPS, METHODS, RELATIONSHIP_BY_ID, METHOD_BY_ID } from '@/data/profile'
import CalendarGrid from '@/components/CalendarGrid.vue'
import BlockEditor from '@/components/BlockEditor.vue'
import PdfImportDialog from '@/components/PdfImportDialog.vue'
import type { Day } from '@/types'
import { addDays, shortDate, longDate, today, weekStart } from '@/utils/time'
import { progress } from '@/utils/evaluation'

const store = useProgramStore()
const ui = useUiStore()
const { mdAndUp } = useDisplay()

const program = computed(() => store.active!)
const highlightOpen = ref(false)
const pdfOpen = ref(false)
const dayDialog = ref<{ date: string; responsible: string; isNew: boolean } | null>(null)

// Bezugsdatum
watch(
  () => program.value?.id,
  (_next, prev) => {
    const p = program.value
    if (!p) return
    const fits = !!ui.date && p.days.some((t) => t.date === ui.date)
    if (prev !== undefined || !fits) ui.date = p.days[0]?.date ?? today()
    if (!p.days.length) ui.calendarMode = 'week'
  },
  { immediate: true },
)

const date = computed(() => ui.date ?? program.value.days[0]?.date ?? today())

const days = computed<Day[]>(() => {
  const existing = new Map(program.value.days.map((t) => [t.date, t]))
  let dates: string[]
  if (ui.calendarMode === 'day') dates = [date.value]
  else if (ui.calendarMode === 'week') {
    const start = weekStart(date.value)
    dates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  } else {
    dates = program.value.days.map((t) => t.date)
    if (!dates.length) {
      const start = weekStart(today())
      dates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
  }
  return dates.map((d) => existing.get(d) ?? { date: d })
})

const visibleBlocks = computed(() => {
  const set = new Set(days.value.map((t) => t.date))
  return program.value.blocks.filter((b) => set.has(b.date))
})

const order = computed(() =>
  [...visibleBlocks.value]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start))
    .map((b) => b.id),
)

const block = computed(() => program.value.blocks.find((b) => b.id === ui.selected) ?? null)

const progressStatus = computed(() => progress(program.value, ui.excludedFor(program.value.id)))

const title = computed(() => {
  if (ui.calendarMode === 'day') return longDate(date.value)
  if (ui.calendarMode === 'week') {
    const s = weekStart(date.value)
    return `${shortDate(s)} – ${shortDate(addDays(s, 6))}${addDays(s, 6).slice(0, 4)}`
  }
  return program.value.name
})

function page(direction: number) {
  const step = ui.calendarMode === 'day' ? 1 : 7
  ui.date = addDays(date.value, direction * step)
}

function setMode(m: CalendarMode) {
  if (m !== 'all' && block.value) ui.date = block.value.date
  ui.calendarMode = m
}

function select(id: string) {
  if (ui.brush) {
    store.toggle(id, ui.brush.kind, ui.brush.id)
    return
  }
  ui.selected = ui.selected === id ? null : id
}

function newBlock(data: { date: string; start: number; end: number }) {
  const b = store.addBlock(program.value.id, data)
  ui.selected = b.id
}

function addBlock() {
  const d = ui.calendarMode === 'all' ? (block.value?.date ?? days.value[0].date) : date.value
  // Standard: Samstagnachmittag
  newBlock({ date: d, start: 14 * 60, end: 17 * 60 })
}

function move(id: string, data: { date: string; start: number; end: number }) {
  store.updateBlock(id, data)
}

function openDay(d: string) {
  const t = program.value.days.find((x) => x.date === d)
  dayDialog.value = { date: d, responsible: t?.responsible ?? '', isNew: false }
}

function newDay() {
  const last = program.value.days[program.value.days.length - 1]?.date
  dayDialog.value = { date: last ? addDays(last, 7) : today(), responsible: '', isNew: true }
}

function saveDay() {
  const t = dayDialog.value
  if (!t?.date) return
  store.updateDay(program.value.id, t.date, { responsible: t.responsible.trim() || undefined })
  if (t.isNew && ui.calendarMode !== 'all') ui.date = t.date
  dayDialog.value = null
}

function removeDay() {
  const t = dayDialog.value
  if (!t) return
  store.removeDay(program.value.id, t.date)
  dayDialog.value = null
}

const dayBlocks = computed(() =>
  dayDialog.value ? program.value.blocks.filter((b) => b.date === dayDialog.value!.date).length : 0,
)

const brushElement = computed(() => {
  const p = ui.brush
  if (!p) return null
  return p.kind === 'relationship'
    ? RELATIONSHIP_BY_ID[p.id as keyof typeof RELATIONSHIP_BY_ID]
    : METHOD_BY_ID[p.id as keyof typeof METHOD_BY_ID]
})

function chooseBrush(kind: 'relationship' | 'method', id: string) {
  ui.brush = { kind, id }
  ui.selected = null
}

const columnWidth = computed(() => (ui.calendarMode === 'day' ? 320 : ui.calendarMode === 'week' ? 130 : 140))
</script>

<template>
  <div class="seite kalender-seite">
    <v-card elevation="0" border class="d-flex flex-column karte">
      <div class="kopfzeile">
        <h1>Kalender</h1>
        <div class="text-h6 font-weight-regular text-truncate flex-grow-1 text-center d-none d-md-block">{{ title }}</div>

        <v-btn-toggle
          :model-value="ui.calendarMode"
          mandatory
          density="comfortable"
          variant="outlined"
          color="primary"
          divided
          @update:model-value="setMode"
        >
          <v-btn value="day">Tag</v-btn>
          <v-btn value="week">Woche</v-btn>
          <v-btn value="all">Alle Tage</v-btn>
        </v-btn-toggle>

        <div v-if="ui.calendarMode !== 'all'" class="d-flex align-center">
          <v-btn icon="mdi-chevron-left" variant="text" size="small" @click="page(-1)" />
          <v-btn icon="mdi-chevron-right" variant="text" size="small" @click="page(1)" />
        </div>

        <v-menu :close-on-content-click="true">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              :variant="ui.brush ? 'flat' : 'outlined'"
              color="primary"
              prepend-icon="mdi-brush-variant"
              title="Ein Element auswählen und dann Blöcke anklicken"
            >
              Pinsel
            </v-btn>
          </template>
          <v-card min-width="300" max-height="70vh" class="overflow-y-auto">
            <v-list density="compact">
              <v-list-subheader>Beziehungen</v-list-subheader>
              <v-list-item v-for="b in RELATIONSHIPS" :key="b.id" :title="b.short" @click="chooseBrush('relationship', b.id)">
                <template #prepend><img :src="b.icon" class="menu-icon" alt="" /></template>
              </v-list-item>
              <v-list-subheader>Methoden</v-list-subheader>
              <v-list-item v-for="m in METHODS" :key="m.id" :title="m.name" @click="chooseBrush('method', m.id)">
                <template #prepend><img :src="m.icon" class="menu-icon" alt="" /></template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>

        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-plus" title="Block hinzufügen" @click="addBlock" />
            <v-list-item prepend-icon="mdi-calendar-plus" title="Tag hinzufügen" @click="newDay" />
            <v-list-item prepend-icon="mdi-file-pdf-box" title="PDF importieren" @click="pdfOpen = true" />
            <v-list-item
              :prepend-icon="highlightOpen ? 'mdi-checkbox-marked-outline' : 'mdi-checkbox-blank-outline'"
              title="Offene Blöcke hervorheben"
              @click="highlightOpen = !highlightOpen"
            />
          </v-list>
        </v-menu>
      </div>

      <div class="statuszeile">
        <template v-if="brushElement && ui.brush">
          <img :src="brushElement.icon" class="menu-icon" alt="" />
          <span>
            Pinsel <b>{{ brushElement.name }}</b>: Blöcke anklicken zum Zuweisen oder Entfernen.
          </span>
          <v-spacer />
          <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-check" @click="ui.brush = null">Fertig</v-btn>
        </template>
        <template v-else>
          <v-icon icon="mdi-gesture-tap" size="18" />
          <span class="text-medium-emphasis">
            Block anklicken zum Zuordnen · Ziehen zum Verschieben · in leere Fläche ziehen für neuen Block
          </span>
          <v-spacer />
          <v-chip
            size="small"
            :color="progressStatus.assigned === progressStatus.count && progressStatus.assigned ? 'success' : 'primary'"
            variant="tonal"
          >
            {{ progressStatus.assigned }} / {{ progressStatus.count }} zugeordnet
          </v-chip>
        </template>
      </div>

      <CalendarGrid
        class="flex-grow-1"
        :days="days"
        :blocks="visibleBlocks"
        :categories="program.categories"
        :selected="ui.selected"
        :brush="ui.brush"
        :column-width="columnWidth"
        :highlight-open="highlightOpen"
        @select="select"
        @empty="ui.selected = null"
        @new="newBlock"
        @move="move"
        @day-click="openDay"
      />
    </v-card>

    <v-btn
      v-if="!block"
      class="fab no-print"
      color="primary"
      icon="mdi-plus"
      size="large"
      elevation="6"
      title="Block hinzufügen"
      @click="addBlock"
    />

    <v-navigation-drawer
      :model-value="!!block"
      location="right"
      :width="440"
      :temporary="!mdAndUp"
      :scrim="!mdAndUp"
      @update:model-value="!$event && (ui.selected = null)"
    >
      <BlockEditor v-if="block" :key="block.id" :block="block" :order="order" />
    </v-navigation-drawer>

    <PdfImportDialog v-model="pdfOpen" :target-program="program.id" />

    <v-dialog :model-value="!!dayDialog" max-width="420" @update:model-value="dayDialog = null">
      <v-card v-if="dayDialog">
        <v-card-title class="pt-4">{{ dayDialog.isNew ? 'Tag hinzufügen' : longDate(dayDialog.date) }}</v-card-title>
        <v-card-text class="d-flex flex-column ga-3">
          <v-text-field v-if="dayDialog.isNew" v-model="dayDialog.date" type="date" label="Datum" />
          <v-text-field v-model="dayDialog.responsible" label="Tagesverantwortliche" />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-btn v-if="!dayDialog.isNew" color="error" variant="text" @click="removeDay">
            Tag entfernen{{ dayBlocks ? ` (${dayBlocks} Blöcke)` : '' }}
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="dayDialog = null">Abbrechen</v-btn>
          <v-btn color="primary" variant="flat" @click="saveDay">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.kalender-seite {
  height: calc(100vh - 56px);
  max-width: none;
}
.karte {
  height: 100%;
  overflow: hidden;
}
.statuszeile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 20px;
  font-size: 0.85rem;
  background: #faf6f9;
  border-bottom: 1px solid var(--linie);
  min-height: 42px;
}
.menu-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  margin-right: 10px;
}
.statuszeile .menu-icon {
  margin-right: 0;
}
.fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 5;
}
</style>
