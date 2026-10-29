export const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.']

export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + n)
  return formatIso(d)
}

export function today(): string {
  return formatIso(new Date())
}

/** "Sa 14.10." */
export function shortDate(date: string): string {
  const d = parseDate(date)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`
}

/** "Sa, 14. Okt. 23" */
export function midDate(date: string): string {
  const d = parseDate(date)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

/** "Samstag, 14.10.2023" */
export function longDate(date: string): string {
  const d = parseDate(date)
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

/** Montag der Woche */
export function weekStart(date: string): string {
  const d = parseDate(date)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return formatIso(d)
}

export function minutesToTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function durationText(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h && m) return `${h} h ${m} min`
  if (h) return `${h} h`
  return `${m} min`
}

export function hours(min: number): string {
  const h = min / 60
  return (Math.round(h * 10) / 10).toLocaleString('de-CH') + ' h'
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
