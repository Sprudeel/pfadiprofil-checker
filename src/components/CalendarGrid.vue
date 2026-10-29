<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Block, Category, Day } from '@/types'
import { RELATIONSHIP_BY_ID, METHOD_BY_ID } from '@/data/profile'
import type { Brush } from '@/stores/ui'
import { midDate, minutesToTime } from '@/utils/time'
import { textColor } from '@/utils/file'

const props = withDefaults(
  defineProps<{
    days: Day[]
    blocks: Block[]
    categories: Category[]
    selected: string | null
    brush: Brush
    pxPerHour?: number
    columnWidth?: number
    highlightOpen?: boolean
  }>(),
  { pxPerHour: 48, columnWidth: 150, highlightOpen: false },
)
const emit = defineEmits<{
  select: [id: string]
  empty: []
  new: [data: { date: string; start: number; end: number }]
  move: [id: string, data: { date: string; start: number; end: number }]
  dayClick: [date: string]
}>()

const GRID = 15

const range = computed(() => {
  let from = 7
  let to = 22
  for (const b of props.blocks) {
    from = Math.min(from, Math.floor(b.start / 60))
    to = Math.max(to, Math.ceil(b.end / 60))
  }
  return { from: Math.max(0, from), to: Math.min(32, to) }
})
const hours = computed(() => Array.from({ length: range.value.to - range.value.from }, (_, i) => range.value.from + i))
const height = computed(() => hours.value.length * props.pxPerHour)

function y(min: number) {
  return ((min - range.value.from * 60) / 60) * props.pxPerHour
}

const categoryMap = computed(() => new Map(props.categories.map((k) => [k.short, k])))
function color(b: Block) {
  return categoryMap.value.get(b.category ?? '')?.color ?? '#CFC6CC'
}

// ---------- Ziehen ----------
type Mode = 'move' | 'length' | 'new'
interface Drag {
  mode: Mode
  id?: string
  startX: number
  startY: number
  date: string
  start: number
  end: number
  moved: boolean
  pointerId: number
}
const drag = ref<Drag | null>(null)
const preview = ref<{ id?: string; date: string; start: number; end: number } | null>(null)

function round(min: number) {
  return Math.round(min / GRID) * GRID
}

function dateUnder(x: number, yy: number): string | null {
  for (const el of document.elementsFromPoint(x, yy)) {
    const d = (el as HTMLElement).dataset?.date
    if (d) return d
  }
  return null
}

function minutesFrom(e: PointerEvent, column: HTMLElement) {
  const r = column.getBoundingClientRect()
  return range.value.from * 60 + ((e.clientY - r.top) / props.pxPerHour) * 60
}

function blockDown(e: PointerEvent, b: Block, mode: 'move' | 'length') {
  if (e.button !== 0) return
  e.stopPropagation()
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  drag.value = {
    mode,
    id: b.id,
    startX: e.clientX,
    startY: e.clientY,
    date: b.date,
    start: b.start,
    end: b.end,
    moved: false,
    pointerId: e.pointerId,
  }
}

function emptyDown(e: PointerEvent, date: string) {
  if (e.button !== 0 || props.brush) return
  const column = e.currentTarget as HTMLElement
  column.setPointerCapture(e.pointerId)
  const start = Math.floor(minutesFrom(e, column) / GRID) * GRID
  drag.value = { mode: 'new', startX: e.clientX, startY: e.clientY, date, start, end: start + 60, moved: false, pointerId: e.pointerId }
}

function onPointerMove(e: PointerEvent) {
  const z = drag.value
  if (!z || e.pointerId !== z.pointerId) return
  if (!z.moved && Math.hypot(e.clientX - z.startX, e.clientY - z.startY) < 5) return
  z.moved = true
  const delta = round(((e.clientY - z.startY) / props.pxPerHour) * 60)
  if (z.mode === 'move') {
    const date = dateUnder(e.clientX, e.clientY) ?? z.date
    preview.value = { id: z.id, date, start: z.start + delta, end: z.end + delta }
  } else if (z.mode === 'length') {
    preview.value = { id: z.id, date: z.date, start: z.start, end: Math.max(z.start + GRID, z.end + delta) }
  } else {
    const end = Math.max(z.start + GRID, round(z.start + ((e.clientY - z.startY) / props.pxPerHour) * 60 + GRID))
    preview.value = { date: z.date, start: z.start, end }
  }
}

function up(e: PointerEvent) {
  const z = drag.value
  if (!z || e.pointerId !== z.pointerId) return
  const v = preview.value
  drag.value = null
  preview.value = null
  if (z.mode === 'new') {
    if (z.moved && v) emit('new', { date: v.date, start: v.start, end: v.end })
    else emit('empty')
    return
  }
  if (!z.moved) {
    emit('select', z.id!)
    return
  }
  if (v && z.id && (v.date !== z.date || v.start !== z.start || v.end !== z.end)) {
    emit('move', z.id, { date: v.date, start: v.start, end: v.end })
  }
}

function cancel() {
  drag.value = null
  preview.value = null
}

// ---------- Anordnung überlappender Blöcke ----------
interface Placement {
  b: Block
  top: number
  height: number
  left: number
  width: number
}

const perDay = computed(() => {
  const map = new Map<string, Placement[]>()
  for (const t of props.days) map.set(t.date, [])
  const list = props.blocks.map((b) => {
    if (preview.value?.id === b.id) return { ...b, date: preview.value.date, start: preview.value.start, end: preview.value.end }
    return b
  })
  const groups = new Map<string, Block[]>()
  for (const b of list) {
    if (!map.has(b.date)) continue
    if (!groups.has(b.date)) groups.set(b.date, [])
    groups.get(b.date)!.push(b)
  }
  for (const [date, bl] of groups) {
    bl.sort((a, b) => a.start - b.start || b.end - a.end)
    const result: Placement[] = []
    let cluster: { b: Block; column: number }[] = []
    let columnEnds: number[] = []
    let clusterEnd = -1
    const finish = () => {
      const n = columnEnds.length || 1
      for (const c of cluster) {
        result.push({
          b: c.b,
          top: y(c.b.start),
          height: Math.max(14, y(c.b.end) - y(c.b.start)),
          left: c.column / n,
          width: 1 / n,
        })
      }
      cluster = []
      columnEnds = []
    }
    for (const b of bl) {
      if (b.start >= clusterEnd) finish()
      let column = columnEnds.findIndex((end) => end <= b.start)
      if (column < 0) {
        column = columnEnds.length
        columnEnds.push(b.end)
      } else columnEnds[column] = b.end
      cluster.push({ b, column })
      clusterEnd = Math.max(clusterEnd, b.end)
    }
    finish()
    map.set(date, result)
  }
  return map
})

function isBrushed(kind: 'relationship' | 'method', id: string) {
  const p = props.brush
  return !!p && p.kind === kind && p.id === id
}

function isOpen(b: Block) {
  return !b.relationships.length && !b.methods.length
}

const gridColumns = computed(() => {
  const n = props.days.length || 1
  return `56px repeat(${n}, minmax(${props.columnWidth}px, 1fr))`
})
</script>

<template>
  <div class="kalender" :class="{ ziehen: !!drag?.moved, pinsel: !!brush }" @pointermove="onPointerMove" @pointerup="up" @pointercancel="cancel">
    <div class="gitter" :style="{ gridTemplateColumns: gridColumns }">
      <!-- Kopfzeile -->
      <div class="ecke" />
      <div v-for="t in days" :key="'k' + t.date" class="tageskopf" role="button" title="Tag bearbeiten" @click="emit('dayClick', t.date)">
        <div class="datum">{{ midDate(t.date) }}</div>
        <div v-if="t.responsible" class="verantw text-truncate" :title="t.responsible">{{ t.responsible }}</div>
      </div>

      <!-- Zeitachse -->
      <div class="achse" :style="{ height: height + 'px' }">
        <div v-for="h in hours" :key="h" class="stunde" :style="{ top: y(h * 60) + 'px' }">
          {{ minutesToTime(h * 60) }}
        </div>
      </div>

      <!-- Tagesspalten -->
      <div
        v-for="t in days"
        :key="t.date"
        class="spalte"
        :data-date="t.date"
        :style="{ height: height + 'px', '--px': pxPerHour + 'px' }"
        @pointerdown="emptyDown($event, t.date)"
      >
        <div
          v-for="p in perDay.get(t.date)"
          :key="p.b.id"
          class="block"
          :class="{
            gewaehlt: selected === p.b.id,
            gezogen: preview?.id === p.b.id,
            gedimmt: highlightOpen && !isOpen(p.b),
            klein: p.height < 34,
          }"
          :style="{
            top: p.top + 'px',
            height: p.height + 'px',
            left: `calc(${p.left * 100}% + 2px)`,
            width: `calc(${p.width * 100}% - 4px)`,
            background: color(p.b),
            color: textColor(color(p.b)),
          }"
          :title="`${p.b.number ?? ''} ${p.b.category ? p.b.category + ': ' : ''}${p.b.title} (${minutesToTime(p.b.start)}–${minutesToTime(p.b.end)})`"
          @pointerdown="blockDown($event, p.b, 'move')"
        >
          <div class="titel">
            <b v-if="p.b.number || p.b.category">{{ [p.b.number, p.b.category].filter(Boolean).join(' ') }}:</b>
            {{ p.b.title || 'Ohne Titel' }}
          </div>
          <div v-if="p.height >= 48 && p.b.responsible" class="verantw">{{ p.b.responsible }}</div>
          <div v-if="p.b.relationships.length || p.b.methods.length" class="tags">
            <img
              v-for="id in p.b.relationships"
              :key="id"
              :src="RELATIONSHIP_BY_ID[id].icon"
              :alt="RELATIONSHIP_BY_ID[id].short"
              :title="RELATIONSHIP_BY_ID[id].name"
              class="tag bez"
              :class="{ 'tag-pinsel': isBrushed('relationship', id) }"
              :style="{ borderColor: RELATIONSHIP_BY_ID[id].ink, '--pinsel-farbe': RELATIONSHIP_BY_ID[id].ink }"
            />
            <img
              v-for="id in p.b.methods"
              :key="id"
              :src="METHOD_BY_ID[id].icon"
              :alt="METHOD_BY_ID[id].short"
              :title="METHOD_BY_ID[id].name"
              class="tag meth"
              :class="{ 'tag-pinsel': isBrushed('method', id) }"
              :style="{ borderColor: METHOD_BY_ID[id].ink, background: METHOD_BY_ID[id].lightColor, '--pinsel-farbe': METHOD_BY_ID[id].ink }"
            />
          </div>
          <span v-else-if="!brush" class="offen-punkt" title="Noch keine Beziehung oder Methode zugeordnet" />
          <div class="griff" @pointerdown="blockDown($event, p.b, 'length')" />
        </div>

        <div
          v-if="preview && !preview.id && preview.date === t.date"
          class="neu-vorschau"
          :style="{ top: y(preview.start) + 'px', height: y(preview.end) - y(preview.start) + 'px' }"
        >
          {{ minutesToTime(preview.start) }}–{{ minutesToTime(preview.end) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kalender {
  overflow: auto;
  position: relative;
  user-select: none;
  touch-action: pan-x pan-y;
}
.kalender.ziehen {
  cursor: grabbing;
}
.gitter {
  display: grid;
  min-width: min-content;
}
.ecke,
.tageskopf {
  position: sticky;
  top: 0;
  z-index: 3;
  background: #fff;
  border-bottom: 1px solid var(--linie);
}
.ecke {
  left: 0;
  z-index: 4;
}
.tageskopf {
  cursor: pointer;
  padding: 8px 6px;
  text-align: center;
  border-left: 1px solid var(--linie);
}
.tageskopf:hover {
  background: #faf6f9;
}
.tageskopf .datum {
  font-size: 0.9rem;
}
.tageskopf .verantw {
  font-size: 0.72rem;
  color: var(--text-grau);
}
.achse {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
}
.stunde {
  position: absolute;
  right: 8px;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--text-grau);
  font-variant-numeric: tabular-nums;
}
.stunde:first-child {
  transform: none;
}
.spalte {
  position: relative;
  border-left: 1px solid var(--linie);
  background: repeating-linear-gradient(
    to bottom,
    #ffffff 0,
    #ffffff var(--px),
    #f6f3f5 var(--px),
    #f6f3f5 calc(var(--px) * 2)
  );
  cursor: crosshair;
}
.kalender.pinsel .spalte {
  cursor: default;
}
.block {
  position: absolute;
  border-radius: 4px;
  padding: 2px 5px 3px;
  font-size: 0.78rem;
  line-height: 1.2;
  overflow: hidden;
  cursor: grab;
  border: 1px solid rgba(0, 0, 0, 0.12);
  transition: box-shadow 0.12s, opacity 0.12s;
  z-index: 1;
}
.kalender.pinsel .block {
  cursor: pointer;
}
.block:hover {
  z-index: 2;
  filter: brightness(1.03);
}
.block.gewaehlt {
  outline: 2.5px solid var(--brombeer-dunkel);
  outline-offset: 1px;
  z-index: 2;
}
.block.gezogen {
  opacity: 0.85;
  z-index: 5;
  box-shadow: 0 6px 18px rgba(92, 38, 74, 0.35);
}
.block.gedimmt {
  opacity: 0.35;
}
.titel {
  font-weight: 500;
  overflow-wrap: anywhere;
}
.block.klein .titel {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.72rem;
}
.verantw {
  font-size: 0.7rem;
  opacity: 0.85;
  margin-top: 1px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 3px;
}
.block.klein .tags {
  position: absolute;
  right: 3px;
  top: 50%;
  transform: translateY(-50%);
  margin: 0;
  flex-wrap: nowrap;
}
.tag {
  width: 18px;
  height: 18px;
  object-fit: contain;
  background: #fff;
  border: 1.5px solid;
  padding: 1px;
}
.block.klein .tag {
  width: 14px;
  height: 14px;
}
.tag.bez {
  border-radius: 50%;
}
.tag.meth {
  border-radius: 4px;
}
.tag.tag-pinsel {
  box-shadow: 0 0 0 2px var(--pinsel-farbe), 0 0 6px 1px var(--pinsel-farbe);
  transform: scale(1.2);
}
.offen-punkt {
  position: absolute;
  right: 4px;
  top: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  border: 1.5px solid var(--brombeer);
}
.griff {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  cursor: ns-resize;
}
.neu-vorschau {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 4px;
  border: 2px dashed var(--brombeer);
  background: rgba(132, 69, 110, 0.12);
  font-size: 0.75rem;
  color: var(--brombeer-dunkel);
  padding: 2px 6px;
  pointer-events: none;
}
</style>
