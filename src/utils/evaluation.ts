import { RELATIONSHIPS, METHODS, type ProfileElement } from '@/data/profile'
import type { Block, Program } from '@/types'

export type Status = 'missing' | 'low' | 'good'

export interface ElementEvaluation<T extends string = string> {
  element: ProfileElement<T>
  count: number
  minutes: number
  /** Anteil an allen zugeordneten Blöcken (0–1) */
  assignedBlockShare: number
  status: Status
  blocks: Block[]
  /** Anzahl Tage, an denen das Element vorkommt */
  occurrenceDaysCount: number
  subPoints: { id: string; name: string; count: number }[]
}

export interface Evaluation {
  blocks: Block[]
  days: string[]
  totalMinutes: number
  assigned: Block[]
  unassigned: Block[]
  relationships: ElementEvaluation[]
  methods: ElementEvaluation[]
  /** matrix[b][m] = Anzahl Blöcke mit Beziehung b und Methode m */
  matrix: number[][]
  /** perDay[date][elementId] = Anzahl Blöcke */
  perDay: Record<string, Record<string, number>>
  notes: { kind: 'missing' | 'low' | 'info' | 'good'; text: string }[]
}

export function duration(b: Block): number {
  return Math.max(0, b.end - b.start)
}

function evaluateElements<T extends string>(
  elements: ProfileElement<T>[],
  blocks: Block[],
  field: 'relationships' | 'methods',
  days: string[],
): ElementEvaluation[] {
  const assigned = blocks.filter((b) => b[field].length > 0).length || 1
  const raw = elements.map((e) => {
    const matches = blocks.filter((b) => (b[field] as string[]).includes(e.id))
    return {
      element: e as ProfileElement<string>,
      count: matches.length,
      minutes: matches.reduce((s, b) => s + duration(b), 0),
      share: matches.length / assigned,
      status: 'good' as Status,
      blocks: matches,
      assignedBlockShare: matches.length / assigned,
      occurrenceDaysCount: new Set(matches.map((b) => b.date)).size,
      subPoints: e.subPoints.map((u) => ({
        id: u.id,
        name: u.name,
        count: matches.filter((b) => b.subPoints.includes(u.id)).length,
      })),
    }
  })
  // "Wenig": weniger als die Hälfte des Durchschnitts
  const average = raw.reduce((s, r) => s + r.count, 0) / raw.length
  for (const r of raw) {
    if (r.count === 0) r.status = 'missing'
    else if (r.count < average * 0.5 || (days.length >= 3 && r.occurrenceDaysCount <= 1 && average >= 3)) r.status = 'low'
  }
  return raw
}

export function evaluateProgram(p: Program, excludedCategories: string[] = []): Evaluation {
  const blocks = p.blocks
    .filter((b) => !b.category || !excludedCategories.includes(b.category))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start))
  const days = [...new Set([...p.days.map((t) => t.date), ...blocks.map((b) => b.date)])].sort()
  const assigned = blocks.filter((b) => b.relationships.length || b.methods.length)
  const unassigned = blocks.filter((b) => !b.relationships.length && !b.methods.length)
  const relationships = evaluateElements(RELATIONSHIPS, blocks, 'relationships', days)
  const methods = evaluateElements(METHODS, blocks, 'methods', days)

  const matrix = RELATIONSHIPS.map((rel) =>
    METHODS.map((m) => blocks.filter((b) => b.relationships.includes(rel.id) && b.methods.includes(m.id)).length),
  )

  const perDay: Record<string, Record<string, number>> = {}
  for (const d of days) perDay[d] = {}
  for (const b of blocks) {
    const t = (perDay[b.date] ??= {})
    for (const id of [...b.relationships, ...b.methods]) t[id] = (t[id] ?? 0) + 1
  }

  const notes: Evaluation['notes'] = []
  if (blocks.length && assigned.length === 0) {
    notes.push({ kind: 'info', text: 'Noch keinem Block wurden Beziehungen oder Methoden zugeordnet.' })
  } else {
    const missingRelationships = relationships.filter((b) => b.status === 'missing')
    const missingMethods = methods.filter((m) => m.status === 'missing')
    const lowRelationships = relationships.filter((b) => b.status === 'low')
    const lowMethods = methods.filter((m) => m.status === 'low')
    if (missingRelationships.length)
      notes.push({ kind: 'missing', text: `Nicht gefördert: ${missingRelationships.map((b) => b.element.name).join(', ')}.` })
    if (missingMethods.length)
      notes.push({ kind: 'missing', text: `Nicht verwendet: ${missingMethods.map((m) => m.element.name).join(', ')}.` })
    if (lowRelationships.length)
      notes.push({ kind: 'low', text: `Wenig gefördert: ${lowRelationships.map((b) => b.element.name).join(', ')}.` })
    if (lowMethods.length)
      notes.push({ kind: 'low', text: `Wenig verwendet: ${lowMethods.map((m) => m.element.name).join(', ')}.` })
    if (!missingRelationships.length && !missingMethods.length && !lowRelationships.length && !lowMethods.length)
      notes.push({ kind: 'good', text: 'Alle fünf Beziehungen und alle acht Methoden sind ausgewogen abgedeckt.' })
    if (unassigned.length && assigned.length)
      notes.push({
        kind: 'info',
        text: `${unassigned.length} von ${blocks.length} Blöcken haben noch keine Zuordnung.`,
      })
  }

  return {
    blocks,
    days,
    totalMinutes: blocks.reduce((s, b) => s + duration(b), 0),
    assigned,
    unassigned,
    relationships,
    methods,
    matrix,
    perDay,
    notes,
  }
}

export function progress(p: Program, excludedCategories: string[] = []): { count: number; assigned: number } {
  const blocks = p.blocks.filter((b) => !b.category || !excludedCategories.includes(b.category))
  return {
    count: blocks.length,
    assigned: blocks.filter((b) => b.relationships.length || b.methods.length).length,
  }
}
