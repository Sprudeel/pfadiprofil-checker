import { defineStore } from 'pinia'
import { ref } from 'vue'

export type CalendarMode = 'day' | 'week' | 'all'
export type Brush = { kind: 'relationship' | 'method'; id: string } | null

const EXCLUDED_CATEGORIES_KEY = 'pfadiprofil-checker:ausgeschlossen'

function loadExcludedCategories(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(EXCLUDED_CATEGORIES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export const useUiStore = defineStore('ui', () => {
  const calendarMode = ref<CalendarMode>('all')
  /** Bezugsdatum für Tag- und Wochenansicht */
  const date = ref<string | null>(null)
  const selected = ref<string | null>(null)
  const brush = ref<Brush>(null)
  const message = ref<{ text: string; color?: string } | null>(null)
  /** Ausgeschlossene Kategorien (z.B. Essen) pro Programm */
  const excludedCategories = ref<Record<string, string[]>>(loadExcludedCategories())

  function notify(text: string, color = 'secondary') {
    message.value = { text, color }
  }

  function excludedFor(programId: string): string[] {
    return excludedCategories.value[programId] ?? []
  }

  function setExcluded(programId: string, list: string[]) {
    excludedCategories.value = { ...excludedCategories.value, [programId]: list }
    try {
      localStorage.setItem(EXCLUDED_CATEGORIES_KEY, JSON.stringify(excludedCategories.value))
    } catch {
      // egal
    }
  }

  function toggleCategory(programId: string, short: string) {
    const list = excludedFor(programId)
    setExcluded(programId, list.includes(short) ? list.filter((x) => x !== short) : [...list, short])
  }

  return { calendarMode, date, selected, brush, message, notify, excludedFor, setExcluded, toggleCategory }
})
