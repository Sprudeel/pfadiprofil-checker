import type { RelationshipId, MethodId } from './data/profile'

export interface Category {
  /** Kürzel wie "LP" */
  short: string
  name: string
  color: string
}

export interface Day {
  /** Datum im Format YYYY-MM-DD */
  date: string
  responsible?: string
}

export interface Block {
  id: string
  /** Datum der Tagesspalte (YYYY-MM-DD) */
  date: string
  /** Minuten ab 00:00 dieses Tages, kann über 1440 gehen (nach Mitternacht) */
  start: number
  end: number
  number?: string
  category?: string
  title: string
  responsible?: string
  location?: string
  notes?: string
  relationships: RelationshipId[]
  methods: MethodId[]
  /** Unterthemen (Beziehungen) und Teilaspekte (Methoden), z.B. "spiel.2" */
  subPoints: string[]
}

export interface Program {
  id: string
  name: string
  group?: string
  level?: string
  motto?: string
  location?: string
  lead?: string
  coach?: string
  categories: Category[]
  days: Day[]
  blocks: Block[]
  created: string
  modified: string
}

export interface AppState {
  app: 'pfadiprofil-checker'
  version: 1
  programs: Program[]
  activeProgram?: string
}
