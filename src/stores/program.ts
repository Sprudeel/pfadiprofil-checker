import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { AppState, Block, Category, Program, Day } from '@/types'
import { RELATIONSHIPS, METHODS, SUBPOINT_BY_ID, type RelationshipId, type MethodId } from '@/data/profile'
import { newId } from '@/utils/id'
import { demoProgram, LEGACY_DEMO_IDS } from '@/data/demo'
import { compareDates } from '@/utils/time'

const STORAGE_KEY = 'pfadiprofil-checker:v1'

export const DEFAULT_CATEGORIES: Category[] = [
  { short: 'LP', name: 'Lagerprogramm', color: '#90B7E4' },
  { short: 'LA', name: 'Lageraktivität', color: '#FF9800' },
  { short: 'LS', name: 'Lagersport', color: '#4DBB52' },
  { short: 'ES', name: 'Essen', color: '#BBBBBB' },
]

const RELATIONSHIP_IDS = new Set<string>(RELATIONSHIPS.map((b) => b.id))
const METHOD_IDS = new Set<string>(METHODS.map((m) => m.id))

function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** Bringt importierte oder gespeicherte Daten in eine gültige Form. */
export function normalizeProgram(raw: unknown): Program | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const dateOk = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
  const blocks: Block[] = Array.isArray(p.blocks)
    ? (p.blocks as Record<string, unknown>[])
        .filter((b) => b && dateOk(b.date))
        .map((b) => {
          const start = num(b.start, 0)
          return {
            id: str(b.id) ?? newId(),
            date: b.date as string,
            start,
            end: Math.max(start + 5, num(b.end, start + 60)),
            number: str(b.number),
            category: str(b.category),
            title: typeof b.title === 'string' ? b.title : '',
            responsible: str(b.responsible),
            location: str(b.location),
            notes: str(b.notes),
            relationships: (Array.isArray(b.relationships) ? b.relationships : []).filter((x): x is RelationshipId =>
              RELATIONSHIP_IDS.has(x as string),
            ),
            methods: (Array.isArray(b.methods) ? b.methods : []).filter((x): x is MethodId =>
              METHOD_IDS.has(x as string),
            ),
            subPoints: (Array.isArray(b.subPoints) ? b.subPoints : []).filter(
              (x): x is string => typeof x === 'string' && x in SUBPOINT_BY_ID,
            ),
          }
        })
    : []
  const days: Day[] = Array.isArray(p.days)
    ? (p.days as Record<string, unknown>[])
        .filter((t) => t && dateOk(t.date))
        .map((t) => ({ date: t.date as string, responsible: str(t.responsible) }))
    : []
  const categories: Category[] = Array.isArray(p.categories)
    ? (p.categories as Record<string, unknown>[])
        .filter((k) => k && str(k.short))
        .map((k) => ({ short: k.short as string, name: str(k.name) ?? (k.short as string), color: str(k.color) ?? '#BBBBBB' }))
    : [...DEFAULT_CATEGORIES]
  const program: Program = {
    id: str(p.id) ?? newId(),
    name: str(p.name) ?? 'Programm',
    group: str(p.group),
    level: str(p.level),
    motto: str(p.motto),
    location: str(p.location),
    lead: str(p.lead),
    coach: str(p.coach),
    categories,
    days,
    blocks,
    created: str(p.created) ?? getCurrentTimestamp(),
    modified: str(p.modified) ?? getCurrentTimestamp(),
  }
  sortDays(program)
  return program
}

function sortDays(p: Program) {
  for (const b of p.blocks) {
    if (!p.days.some((t) => t.date === b.date)) p.days.push({ date: b.date })
  }
  p.days.sort((a, b) => compareDates(a.date, b.date))
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        app: 'pfadiprofil-checker',
        version: 1,
        programs: (parsed.programs ?? []).map(normalizeProgram).filter(Boolean) as Program[],
        activeProgram: parsed.activeProgram,
      }
    }
  } catch {
    // Speicher nicht lesbar: leer starten
  }
  return { app: 'pfadiprofil-checker', version: 1, programs: [] }
}

export interface ImportResult {
  count: number
  error?: string
}

export const useProgramStore = defineStore('program', () => {
  const start = loadState()
  const programs = ref<Program[]>(start.programs)
  const activeId = ref<string | undefined>(
    start.programs.some((p) => p.id === start.activeProgram) ? start.activeProgram : start.programs[0]?.id,
  )
  const storageError = ref(false)

  const active = computed(() => programs.value.find((p) => p.id === activeId.value))

  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    [programs, activeId],
    () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(exportState()))
          storageError.value = false
        } catch {
          storageError.value = true
        }
      }, 300)
    },
    { deep: true },
  )

  function touch(p: Program) {
    p.modified = getCurrentTimestamp()
  }

  function select(id: string) {
    activeId.value = id
  }

  function newProgram(data: Partial<Program> = {}): Program {
    const p = normalizeProgram({ name: 'Neues Programm', categories: DEFAULT_CATEGORIES, ...data })!
    p.id = newId()
    programs.value.push(p)
    activeId.value = p.id
    return programs.value[programs.value.length - 1]
  }

  function deleteProgram(id: string) {
    programs.value = programs.value.filter((p) => p.id !== id)
    if (activeId.value === id) activeId.value = programs.value[0]?.id
  }

  function duplicateProgram(id: string) {
    const p = programs.value.find((x) => x.id === id)
    if (!p) return
    const copy = normalizeProgram(JSON.parse(JSON.stringify(p)))!
    copy.id = newId()
    copy.name = `${p.name} (Kopie)`
    copy.blocks.forEach((b) => (b.id = newId()))
    programs.value.push(copy)
    activeId.value = copy.id
  }

  function findBlock(id: string): { p: Program; b: Block } | undefined {
    for (const p of programs.value) {
      const b = p.blocks.find((x) => x.id === id)
      if (b) return { p, b }
    }
  }

  function addBlock(programId: string, data: Partial<Block> & Pick<Block, 'date' | 'start' | 'end'>): Block {
    const p = programs.value.find((x) => x.id === programId)!
    const b: Block = {
      id: newId(),
      title: '',
      relationships: [],
      methods: [],
      subPoints: [],
      ...data,
    }
    p.blocks.push(b)
    sortDays(p)
    touch(p)
    return p.blocks[p.blocks.length - 1]
  }

  function updateBlock(id: string, data: Partial<Block>) {
    const f = findBlock(id)
    if (!f) return
    Object.assign(f.b, data)
    if (f.b.end <= f.b.start) f.b.end = f.b.start + 15
    sortDays(f.p)
    touch(f.p)
  }

  function deleteBlock(id: string) {
    const f = findBlock(id)
    if (!f) return
    f.p.blocks = f.p.blocks.filter((b) => b.id !== id)
    touch(f.p)
  }

  function duplicateBlock(id: string): Block | undefined {
    const f = findBlock(id)
    if (!f) return
    const copy: Block = JSON.parse(JSON.stringify(f.b))
    copy.id = newId()
    copy.number = undefined
    f.p.blocks.push(copy)
    touch(f.p)
    return f.p.blocks[f.p.blocks.length - 1]
  }

  /** Beziehung, Methode oder Unterpunkt an einem Block an- oder abwählen */
  function toggle(blockId: string, kind: 'relationship' | 'method' | 'subPoint', value: string, on?: boolean) {
    const f = findBlock(blockId)
    if (!f) return
    const list = (kind === 'relationship' ? f.b.relationships : kind === 'method' ? f.b.methods : f.b.subPoints) as string[]
    const idx = list.indexOf(value)
    const should = on ?? idx < 0
    if (should && idx < 0) list.push(value)
    if (!should && idx >= 0) list.splice(idx, 1)
    // Ein Unterpunkt wählt automatisch auch seine Beziehung bzw. Methode
    if (kind === 'subPoint' && should) {
      const parent = SUBPOINT_BY_ID[value]?.parent
      if (parent && RELATIONSHIP_IDS.has(parent) && !f.b.relationships.includes(parent as RelationshipId))
        f.b.relationships.push(parent as RelationshipId)
      if (parent && METHOD_IDS.has(parent) && !f.b.methods.includes(parent as MethodId))
        f.b.methods.push(parent as MethodId)
    }
    // Wird eine Beziehung/Methode entfernt, fallen auch ihre Unterpunkte weg
    if (kind !== 'subPoint' && !should) {
      f.b.subPoints = f.b.subPoints.filter((u) => SUBPOINT_BY_ID[u]?.parent !== value)
    }
    touch(f.p)
  }

  function updateDay(programId: string, date: string, data: Partial<Day>) {
    const p = programs.value.find((x) => x.id === programId)
    if (!p) return
    let t = p.days.find((x) => x.date === date)
    if (!t) {
      t = { date }
      p.days.push(t)
    }
    Object.assign(t, data)
    sortDays(p)
    touch(p)
  }

  function removeDay(programId: string, date: string) {
    const p = programs.value.find((x) => x.id === programId)
    if (!p) return
    p.blocks = p.blocks.filter((b) => b.date !== date)
    p.days = p.days.filter((t) => t.date !== date)
    touch(p)
  }

  function replaceProgram(program: Program) {
    const idx = programs.value.findIndex((p) => p.id === program.id)
    if (idx >= 0) programs.value[idx] = program
    else programs.value.push(program)
    sortDays(program)
    activeId.value = program.id
  }

  /** Lädt das Demo-Programm (ersetzt eine frühere Demo-Version) */
  function loadDemo(): Program {
    programs.value = programs.value.filter((p) => !LEGACY_DEMO_IDS.includes(p.id))
    const demo = demoProgram()
    replaceProgram(demo)
    return demo
  }

  function exportState(): AppState {
    return {
      app: 'pfadiprofil-checker',
      version: 1,
      programs: JSON.parse(JSON.stringify(programs.value)),
      activeProgram: activeId.value,
    }
  }

  /** Liest eine exportierte JSON-Datei ein. */
  function importState(text: string, mode: 'replace' | 'add'): ImportResult {
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return { count: 0, error: 'Die Datei ist kein gültiges JSON.' }
    }
    const raw = data as Partial<AppState> & { programs?: unknown[] }
    let list: unknown[]
    if (raw && raw.app === 'pfadiprofil-checker' && Array.isArray(raw.programs)) list = raw.programs
    else if (raw && Array.isArray((raw as { blocks?: unknown }).blocks)) list = [raw]
    else return { count: 0, error: 'Die Datei stammt nicht aus dem Pfadiprofil-Checker.' }
    const imported = list.map(normalizeProgram).filter(Boolean) as Program[]
    if (mode === 'replace') {
      programs.value = imported
      activeId.value = imported.some((p) => p.id === raw.activeProgram) ? raw.activeProgram : imported[0]?.id
    } else {
      for (const p of imported) {
        if (programs.value.some((x) => x.id === p.id)) {
          p.id = newId()
          p.name = `${p.name} (importiert)`
        }
        programs.value.push(p)
      }
      if (imported[0]) activeId.value = imported[0].id
    }
    return { count: imported.length }
  }

  return {
    programs,
    activeId,
    active,
    storageError,
    select,
    newProgram,
    deleteProgram,
    duplicateProgram,
    replaceProgram,
    loadDemo,
    findBlock,
    addBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    toggle,
    updateDay,
    removeDay,
    exportState,
    importState,
    touch,
  }
})
