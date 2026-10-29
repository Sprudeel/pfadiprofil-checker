<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useProgramStore } from '@/stores/program'
import { useUiStore } from '@/stores/ui'
import { RELATIONSHIPS, METHODS, type ProfileElement } from '@/data/profile'
import ProfileSelector from './ProfileSelector.vue'
import type { Block } from '@/types'
import { midDate, durationText, minutesToTime, timeToMinutes } from '@/utils/time'
import { textColor } from '@/utils/file'

const props = defineProps<{ block: Block; order: string[] }>()
const store = useProgramStore()
const ui = useUiStore()
const deleteQuestion = ref(false)

const RELATIONSHIP_KEYS = ['1', '2', '3', '4', '5']
const METHOD_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I']

const program = computed(() => store.active!)
const category = computed(() => program.value.categories.find((k) => k.short === props.block.category))

function set<K extends keyof Block>(field: K, value: Block[K]) {
  store.updateBlock(props.block.id, { [field]: value } as Partial<Block>)
}

function setTime(field: 'start' | 'end', value: string) {
  const m = timeToMinutes(value)
  if (m === null) return
  if (field === 'start') {
    const next = m + (props.block.start >= 1440 ? 1440 : 0)
    const length = props.block.end - props.block.start
    store.updateBlock(props.block.id, { start: next, end: next + length })
  } else {
    let next = m + (m < props.block.start % 1440 ? 1440 : 0) + Math.floor(props.block.start / 1440) * 1440
    if (next <= props.block.start) next += 1440
    store.updateBlock(props.block.id, { end: next })
  }
}

const idx = computed(() => props.order.indexOf(props.block.id))
function jump(delta: number) {
  const target = props.order[idx.value + delta]
  if (target) ui.selected = target
}

function toggle(kind: 'relationship' | 'method' | 'subPoint', id: string) {
  store.toggle(props.block.id, kind, id)
}

function duplicate() {
  const k = store.duplicateBlock(props.block.id)
  if (k) ui.selected = k.id
}

function remove() {
  const next = props.order[idx.value + 1] ?? props.order[idx.value - 1] ?? null
  store.deleteBlock(props.block.id)
  ui.selected = next
  deleteQuestion.value = false
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const k = e.key.toUpperCase()
  const b = RELATIONSHIP_KEYS.indexOf(k)
  const m = METHOD_KEYS.indexOf(k)
  if (b >= 0) toggle('relationship', RELATIONSHIPS[b].id)
  else if (m >= 0) toggle('method', METHODS[m].id)
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') jump(1)
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k') jump(-1)
  else if (e.key === 'Escape') ui.selected = null
  else return
  e.preventDefault()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const relationships = RELATIONSHIPS as unknown as ProfileElement<string>[]
const methods = METHODS as unknown as ProfileElement<string>[]
</script>

<template>
  <div class="editor">
    <div class="kopf">
      <v-btn icon="mdi-chevron-left" variant="text" size="small" :disabled="idx <= 0" title="Vorheriger Block (←)" @click="jump(-1)" />
      <div class="flex-grow-1 min-w-0">
        <div class="d-flex align-center ga-2">
          <span v-if="block.number" class="text-h6 font-weight-medium">{{ block.number }}</span>
          <span
            v-if="block.category"
            class="kat"
            :style="{ background: category?.color ?? '#BBB', color: textColor(category?.color ?? '#BBBBBB') }"
            >{{ block.category }}</span
          >
          <span class="text-h6 font-weight-medium text-truncate">{{ block.title || 'Ohne Titel' }}</span>
        </div>
        <div class="text-body-2 text-medium-emphasis">
          {{ midDate(block.date) }} · {{ minutesToTime(block.start) }}–{{ minutesToTime(block.end) }} ·
          {{ durationText(block.end - block.start) }}
        </div>
      </div>
      <v-btn
        icon="mdi-chevron-right"
        variant="text"
        size="small"
        :disabled="idx >= order.length - 1"
        title="Nächster Block (→)"
        @click="jump(1)"
      />
      <v-btn icon="mdi-close" variant="text" size="small" title="Schliessen (Esc)" @click="ui.selected = null" />
    </div>

    <div class="inhalt">
      <section>
        <div class="d-flex align-center mb-2">
          <h3 class="abschnitt-titel mb-0">Beziehungen</h3>
          <v-spacer />
          <span class="text-caption text-medium-emphasis">Tasten 1–5</span>
        </div>
        <ProfileSelector
          :elements="relationships"
          :selected="block.relationships"
          :sub-points="block.subPoints"
          :keys="RELATIONSHIP_KEYS"
          @toggle="toggle('relationship', $event)"
          @toggle-sub-point="toggle('subPoint', $event)"
        />
      </section>

      <section>
        <div class="d-flex align-center mb-2">
          <h3 class="abschnitt-titel mb-0">Methoden</h3>
          <v-spacer />
          <span class="text-caption text-medium-emphasis">Tasten Q–I</span>
        </div>
        <ProfileSelector
          :elements="methods"
          :selected="block.methods"
          :sub-points="block.subPoints"
          :keys="METHOD_KEYS"
          @toggle="toggle('method', $event)"
          @toggle-sub-point="toggle('subPoint', $event)"
        />
      </section>

      <section>
        <h3 class="abschnitt-titel">Block</h3>
        <v-row dense>
          <v-col cols="9">
            <v-text-field
              :model-value="block.title"
              label="Titel"
              :autofocus="!block.title"
              @update:model-value="set('title', $event)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
          </v-col>
          <v-col cols="3">
            <v-text-field :model-value="block.number" label="Nr." @update:model-value="set('number', $event || undefined)" />
          </v-col>
          <v-col cols="6">
            <v-select
              :model-value="block.category"
              :items="program.categories.map((k) => ({ title: `${k.short} – ${k.name}`, value: k.short }))"
              label="Kategorie"
              clearable
              @update:model-value="set('category', $event ?? undefined)"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              :model-value="block.date"
              type="date"
              label="Tag"
              @update:model-value="$event && set('date', $event)"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              :model-value="minutesToTime(block.start)"
              type="time"
              label="Beginn"
              @update:model-value="$event && setTime('start', $event)"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              :model-value="minutesToTime(block.end)"
              type="time"
              label="Ende"
              @update:model-value="$event && setTime('end', $event)"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              :model-value="block.responsible"
              label="Verantwortlich"
              @update:model-value="set('responsible', $event || undefined)"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field :model-value="block.location" label="Ort" @update:model-value="set('location', $event || undefined)" />
          </v-col>
          <v-col cols="12">
            <v-textarea
              :model-value="block.notes"
              label="Notizen"
              rows="2"
              auto-grow
              @update:model-value="set('notes', $event || undefined)"
            />
          </v-col>
        </v-row>
      </section>
    </div>

    <div class="fuss">
      <v-btn variant="text" prepend-icon="mdi-content-copy" size="small" @click="duplicate">Duplizieren</v-btn>
      <v-spacer />
      <v-btn variant="text" color="error" prepend-icon="mdi-delete-outline" size="small" @click="deleteQuestion = true">
        Löschen
      </v-btn>
    </div>

    <v-dialog v-model="deleteQuestion" max-width="400">
      <v-card>
        <v-card-title class="pt-4">Block löschen?</v-card-title>
        <v-card-text>«{{ block.title || 'Ohne Titel' }}» wird entfernt.</v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteQuestion = false">Abbrechen</v-btn>
          <v-btn color="error" variant="flat" @click="remove">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.kopf {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 8px 12px 8px;
  border-bottom: 1px solid var(--linie);
}
.min-w-0 {
  min-width: 0;
}
.kat {
  border-radius: 6px;
  padding: 1px 7px;
  font-size: 0.8rem;
  font-weight: 600;
  flex: none;
}
.inhalt {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.fuss {
  display: flex;
  padding: 8px 12px;
  border-top: 1px solid var(--linie);
}
</style>
