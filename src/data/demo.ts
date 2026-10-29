// Demo: das Herbstlager «Verloren in der Zeit» der Pfadi Wart, mit Beziehungen und Methoden ausgefüllt.
// Zeigt, wie Kalender, Übersicht und PDF aussehen, wenn ein echtes Lager sorgfältig zugeordnet ist.
import type { Program } from '@/types'
import data from './demo-herbstlager.json'

export const DEMO_ID = 'demo'
/** In der Übersicht der Demo standardmässig ausgeblendet */
export const DEMO_EXCLUDED_CATEGORIES = ['ES']
/** IDs früherer Demo-Versionen, die beim Laden der Demo ersetzt werden */
export const LEGACY_DEMO_IDS = ['demo-sommerlager']

export function demoProgram(): Program {
  const now = new Date().toISOString()
  const copy = JSON.parse(JSON.stringify(data)) as Omit<Program, 'id' | 'created' | 'modified'>
  return { ...copy, id: DEMO_ID, created: now, modified: now }
}
