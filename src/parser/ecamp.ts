// Erkennt in den Seiten eines eCamp-Grobprogramms (PDF) Tage, Zeitachse und Blöcke.
// Unterstützt den alten eCamp-Druck (PDFKit) und den neuen Druck (Chrome).

import type { Rect, PageData, TextItem } from './extract'
import type { Category, Day } from '@/types'

export interface ParseBlock {
  date: string
  start: number
  end: number
  number?: string
  category?: string
  title: string
  responsible?: string
  color?: string
}

export interface ParseResult {
  title?: string
  section?: string
  group?: string
  campName?: string
  motto?: string
  location?: string
  lead?: string
  coach?: string
  categories: Category[]
  days: Day[]
  blocks: ParseBlock[]
  warnings: string[]
}

const DATE_RE = /^(Mo|Di|Mi|Do|Fr|Sa|So)\.?,?\s+(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})$/
const TIME_RE = /^(\d{1,2}):(\d{2})$/
const DATE_RANGE_RE = /\d{1,2}\.\d{1,2}\.\d{2,4}\s*[-–]\s*\w{2}\.?\s+\d{1,2}\.\d{1,2}\.\d{2,4}/

interface Line extends TextItem {
  /** rechter Rand */
  r: number
}

function clean(s: string): string {
  return s.replace(/[​­]/g, '').replace(/\s+/g, ' ').trim()
}

/** Fügt Textstücke auf derselben Grundlinie zu Zeilen zusammen. */
function toLines(texts: TextItem[], maxGap = 0.6): Line[] {
  const sorted = [...texts].sort((a, b) => a.y - b.y || a.x - b.x)
  const groups: TextItem[][] = []
  for (const t of sorted) {
    const g = groups.find((g) => Math.abs(g[0].y - t.y) < 0.8 && Math.abs(g[0].size - t.size) < 1.2)
    if (g) g.push(t)
    else groups.push([t])
  }
  const lines: Line[] = []
  for (const g of groups) {
    g.sort((a, b) => a.x - b.x)
    let current: Line | null = null
    for (const t of g) {
      if (current && t.x - current.r <= maxGap * t.size && t.x - current.r > -t.size) {
        const gap = t.x - current.r
        const space = gap > 0.12 * t.size && !current.str.endsWith(' ') && !t.str.startsWith(' ')
        current.str += (space ? ' ' : '') + t.str
        current.r = Math.max(current.r, t.x + t.w)
        current.w = current.r - current.x
      } else {
        if (current) lines.push(current)
        current = { ...t, r: t.x + t.w }
      }
    }
    if (current) lines.push(current)
  }
  for (const z of lines) z.str = clean(z.str)
  return lines.filter((z) => z.str)
}

function median(values: number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function contains(r: Rect, x: number, y: number, tolerance = 0.5): boolean {
  return x >= r.x - tolerance && x <= r.x + r.w + tolerance && y >= r.y - tolerance && y <= r.y + r.h + tolerance
}

function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / Math.min(a.w * a.h, b.w * b.h)
}

function isoDate(day: string, month: string, year: string): string {
  const y = year.length === 2 ? `20${year}` : year
  return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function round(min: number, step = 5): number {
  return Math.round(min / step) * step
}

interface Column {
  date: string
  left: number
  right: number
  headY: number
}

interface TimeAxis {
  /** y-Position der Stundenlinie h (h kann > 24 sein) */
  yFor: (hour: number) => number
  minutesFor: (y: number) => number
  top: number
  /** Stundenlinie der letzten beschrifteten Stunde */
  bottom: number
  pxPerHour: number
  wasRead: boolean
}

function findColumns(lines: Line[], rects: Rect[]): Column[] {
  const heads = lines.filter((z) => DATE_RE.test(z.str))
  if (!heads.length) return []
  const minY = Math.min(...heads.map((k) => k.y))
  const top = heads.filter((k) => k.y < minY + 4).sort((a, b) => a.x - b.x)
  const centers = top.map((k) => k.x + k.w / 2)
  let spacing = median(centers.slice(1).map((m, i) => m - centers[i]))
  if (!spacing) {
    // Nur eine Spalte: Breite aus einem passenden Hintergrundstreifen nehmen
    const strips = rects.filter((r) => r.x < centers[0] && r.x + r.w > centers[0] && r.y > minY && r.w > 60)
    spacing = strips.length ? Math.max(...strips.map((r) => r.w)) : 180
  }
  return top.map((k, i) => {
    const m = DATE_RE.exec(k.str)!
    return {
      date: isoDate(m[2], m[3], m[4]),
      left: centers[i] - spacing / 2,
      right: centers[i] + spacing / 2,
      headY: k.y,
    }
  })
}

function findTimeAxis(lines: Line[], rects: Rect[], columns: Column[], warnings: string[]): TimeAxis {
  const left = columns[0].left
  const headY = Math.max(...columns.map((s) => s.headY))
  const width = columns[0].right - columns[0].left
  const labels = lines
    .filter((z) => TIME_RE.test(z.str) && z.r < left + 3 && z.y > headY + 5)
    .sort((a, b) => a.y - b.y)

  // Stunden "auspacken": nach 23 Uhr geht es mit 24, 25 … weiter
  const points: { h: number; y: number; size: number }[] = []
  let offset = 0
  let previous = -1
  for (const l of labels) {
    const m = TIME_RE.exec(l.str)!
    let h = Number(m[1]) + Number(m[2]) / 60
    if (h + offset <= previous) offset += 24
    h += offset
    previous = h
    points.push({ h, y: l.y, size: l.size })
  }

  // Hintergrundstreifen (ganze Spaltenbreite, eine Stunde hoch) markieren Stundenlinien
  const roughPx = points.length >= 2 ? (points[points.length - 1].y - points[0].y) / (points[points.length - 1].h - points[0].h) : 20
  const strips = rects.filter(
    (r) => r.w >= width - 2 && r.w <= width + 2 && Math.abs(r.h - roughPx) < roughPx * 0.3 && r.y > headY,
  )

  if (points.length >= 2) {
    // Stützpunkte (Stunde, y der Stundenlinie). Die Streifen liegen exakt auf dem Raster,
    // die Beschriftungen sind im Chrome-Druck leicht verschoben. Darum Streifen bevorzugen.
    const anchors: { h: number; y: number }[] = []
    for (const s of strips) {
      const nearest = points.reduce((best, p) => (Math.abs(p.y - s.y) < Math.abs(best.y - s.y) ? p : best))
      if (Math.abs(nearest.y - s.y) < roughPx / 2) {
        anchors.push({ h: nearest.h, y: s.y }, { h: nearest.h + 1, y: s.y + s.h })
      }
    }
    if (anchors.length < 4) {
      const delta = 0.35 * points[0].size
      anchors.length = 0
      for (const p of points) anchors.push({ h: p.h, y: p.y - delta })
    }
    // Lineare Ausgleichsgerade y = a + b·h
    const n = anchors.length
    const meanH = anchors.reduce((s, p) => s + p.h, 0) / n
    const meanY = anchors.reduce((s, p) => s + p.y, 0) / n
    const slope = anchors.reduce((s, p) => s + (p.h - meanH) * (p.y - meanY), 0) / anchors.reduce((s, p) => s + (p.h - meanH) ** 2, 0)
    const intercept = meanY - slope * meanH
    return {
      yFor: (h) => intercept + slope * h,
      minutesFor: (y) => ((y - intercept) / slope) * 60,
      top: intercept + slope * points[0].h,
      bottom: intercept + slope * points[points.length - 1].h,
      pxPerHour: slope,
      wasRead: true,
    }
  }

  // Keine lesbaren Uhrzeiten: aus den Streifen schätzen und 07:00 als Start annehmen
  warnings.push('Die Uhrzeiten konnten nicht gelesen werden. Es wurde 07:00 als erste Stunde angenommen – bitte prüfen.')
  const tops = [...new Set(strips.map((s) => Math.round(s.y * 10) / 10))].sort((x, y) => x - y)
  const px = strips.length ? median(strips.map((s) => s.h)) : 20
  const top = tops[0] ?? headY + 20
  return {
    yFor: (h) => top + (h - 7) * px,
    minutesFor: (y) => ((y - top) / px + 7) * 60,
    top,
    bottom: strips.length ? Math.max(...strips.map((r) => r.y + r.h)) : top,
    pxPerHour: px,
    wasRead: false,
  }
}

function findLegend(
  lines: Line[],
  rects: Rect[],
  below: number,
): { categories: Category[]; y: number; top: number } {
  const categories: Category[] = []
  let maxY = 0
  const matches: { r: Rect; inner?: Line; label?: Line }[] = []
  for (const r of rects) {
    if (r.y < below || r.h > 22 || r.w > 80 || r.h < 5 || r.w < 8) continue
    const inner = lines.find((z) => contains(r, z.x + 1, z.y - z.size * 0.35, 1) && z.str.length <= 12)
    const label = lines
      .filter(
        (z) => z !== inner && z.y > r.y && z.y < r.y + r.h + 2 && z.x >= r.x + r.w - 1 && z.x < r.x + r.w + 40,
      )
      .sort((a, b) => a.x - b.x)[0]
    // Felder ohne lesbaren Text (z.B. Emoji im alten Druck) zählen, wenn rechts ein Name steht
    if (inner || label) matches.push({ r, inner, label })
  }
  // Die Legende besteht aus den untersten, eng beieinander liegenden Reihen solcher Farbfelder
  const rowYs = [...new Set(matches.map((t) => Math.round(t.r.y)))].sort((a, b) => b - a)
  let boundary = rowYs[0] ?? Infinity
  for (const y of rowYs.slice(1)) {
    if (boundary - y < 30) boundary = y
    else break
  }
  const row = matches.filter((t) => t.r.y > boundary - 4 && t.inner)
  const noText = matches.filter((t) => t.r.y > boundary - 4 && !t.inner)
  const top = row.length ? Math.min(...row.map((t) => t.r.y)) : Infinity
  for (const { r, inner, label } of [...row, ...noText]) {
    const short = inner ? inner.str.trim() : (label?.str ?? '').trim()
    if (!short || categories.some((k) => k.short === short)) continue
    categories.push({ short, name: label?.str ?? short, color: r.color.toUpperCase() })
    maxY = Math.max(maxY, r.y + r.h, inner?.y ?? 0, label?.y ?? 0)
  }
  return { categories, y: maxY, top }
}

function isShortCodeLine(z: Line): boolean {
  return z.size <= 6.6 && /^[A-ZÄÖÜ]{1,3}( [A-ZÄÖÜ]{1,3})*$/.test(z.str)
}

/** Häufige kurze Wörter: Ein Umbruch davor ist fast sicher ein normaler Wortumbruch. */
const SHORT_WORDS = new Set(
  'und mit der die das den dem des ein eine im in am an auf aus zum zur von vom für bei the and of a to for in on at with'.split(' '),
)

/** Ungefähre Breite eines Zeichens (Inter) in Einheiten der Schriftgrösse */
function charWidth(ch: string): number {
  if ('mw'.includes(ch)) return 0.9
  if ('MW'.includes(ch)) return 0.95
  if ('iljI.,:;!|\''.includes(ch)) return 0.27
  if ('tfr'.includes(ch)) return 0.38
  if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) return 0.68
  return 0.57
}

/** Erkennt den Anfang eines Blocktitels ("LP 1.1 …", "1.1 LP: …", "ES: …") */
function isTitleStart(s: string, known: Set<string>): boolean {
  if (/^(\S{1,14} )?\d{1,2}[. ]\d{1,3}\b/.test(s)) return true
  if (/^\S{1,14}: /.test(s)) return true
  const first = s.split(' ')[0]
  return known.has(first)
}

/** Setzt die Zeilen eines Blocks zu einem Text zusammen. */
function blockText(lines: Line[], rect: Rect): string {
  const rows: Line[][] = []
  for (const z of [...lines].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const r = rows.find((r) => Math.abs(r[0].y - z.y) < 1.5)
    if (r) r.push(z)
    else rows.push([z])
  }
  let text = ''
  let prevRight = 0
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x)
    const s = row.map((z) => z.str).join(' ')
    if (!text) text = s
    else if (/[a-zäöüß]-$/i.test(text) && /^[a-zäöüß]/.test(s)) text = text.slice(0, -1) + s
    else if (
      /[a-zäöüß]$/i.test(text) &&
      /^[a-zäöüß]/.test(s) &&
      !SHORT_WORDS.has(s.split(' ')[0]) &&
      rect.x + rect.w - 0.75 - prevRight < row[0].size * charWidth(s[0])
    )
      text += s // Das nächste Zeichen hatte keinen Platz mehr: Wort wurde ohne Trennstrich umgebrochen
    else text += ' ' + s
    prevRight = Math.max(...row.map((z) => z.r))
  }
  return clean(text)
}

function splitBlockText(
  text: string,
  knownCategories: Set<string>,
): { number?: string; category?: string; title: string; responsible?: string } {
  let rest = text
  let number: string | undefined
  let category: string | undefined
  let responsible: string | undefined

  // Verantwortliche stehen im neuen Druck in eckigen Klammern am Ende
  const bracket = /\s*\[([^\[\]]*)\]?\s*$/.exec(rest)
  if (bracket) {
    responsible = clean(bracket[1])
    rest = (rest.slice(0, bracket.index) + ' ' + rest.slice(bracket.index + bracket[0].length)).trim()
  }

  // Sehr kleine Blöcke: der Punkt der Nummer fehlt manchmal ("8 9 LS: …")
  rest = rest.replace(/^(\d{1,2}) (\d{1,3}) (?=\S{1,14}:)/, '$1.$2 ')

  // Alter Druck: "LP 1.1 Titel"
  const first = rest.split(' ')[0]
  if (knownCategories.has(first) && !rest.startsWith(first + ':')) {
    category = first
    rest = rest.slice(first.length).trim()
  }
  const nr = /^(\d{1,2}\.\d{1,3})(?:\s+(.*))?$/.exec(rest)
  if (nr) {
    number = nr[1]
    rest = nr[2] ?? ''
  }
  // Neuer Druck: "1.1 LP: Titel"
  if (!category) {
    const kat = /^([^\s:]{1,14}):\s*(.*)$/.exec(rest)
    if (kat) {
      category = kat[1]
      rest = kat[2]
    }
  }
  return { number, category, title: rest.trim(), responsible: responsible || undefined }
}

function parsePage(page: PageData, result: ParseResult, pageNumber: number) {
  const lines = toLines(page.texts)
  const columns = findColumns(lines, page.rects)
  if (!columns.length) {
    result.warnings.push(`Seite ${pageNumber}: keine Tagesspalten gefunden.`)
    return
  }
  const axis = findTimeAxis(lines, page.rects, columns, result.warnings)
  const headY = Math.max(...columns.map((s) => s.headY))

  // Legende und Fusszeile liegen unter dem Raster
  const gridLeft = columns[0].left
  const gridRight = columns[columns.length - 1].right
  const width = columns[0].right - columns[0].left
  const legendCandidates = findLegend(lines, page.rects, axis.bottom + 2)
  // Die Legende ist die unterste Gruppe kleiner Farbfelder
  const legend = legendCandidates.categories.length ? legendCandidates : { categories: [], y: page.height, top: page.height }
  for (const k of legend.categories) {
    if (!result.categories.some((x) => x.short === k.short)) result.categories.push(k)
  }
  const legendTop = legend.categories.length ? legendCandidates.top : page.height
  const gridBottom = Math.min(legendTop, page.height) - 1

  // Tage mit Tagesverantwortlichen
  for (const s of columns) {
    const below = lines
      .filter((z) => z.y > s.headY + 1 && z.y < axis.top && z.x >= s.left - 2 && z.r <= s.right + 2)
      .map((z) => z.str)
      .join(' ')
    const responsible = clean(below.replace(/Tagesverantwortliche:?/i, '')) || undefined
    if (!result.days.some((t) => t.date === s.date)) result.days.push({ date: s.date, responsible })
  }

  // Blöcke: farbige Rechtecke im Raster, die nicht Hintergrundstreifen oder Avatare sind
  const candidates = page.rects.filter((r) => {
    if (r.y < axis.top - 2 || r.y > gridBottom || r.y < headY) return false
    if (r.x < gridLeft - 2 || r.x + r.w > gridRight + 2) return false
    if (r.w < 6 || r.h < 3) return false
    if (r.w >= width - 2) return false
    if (r.w <= 14 && r.h <= 14 && Math.abs(r.w - r.h) < 1.5) return false
    if (r.color === '#ffffff' || r.color === '') return false
    return true
  })

  // Rohe Textstücke den Blöcken zuordnen (erst danach zu Zeilen zusammenfügen,
  // sonst verschmelzen Texte von schmalen Blöcken nebeneinander)
  const assignments = new Map<Rect, TextItem[]>()
  const gridTexts = page.texts.filter((z) => z.y > axis.top - 2 && z.y < gridBottom && z.x >= gridLeft - 1 && z.x < gridRight)
  for (const z of gridTexts) {
    const px = z.x + Math.min(1, z.w / 2)
    const py = z.y - z.size * 0.35
    let best: Rect | undefined
    for (const r of candidates) {
      if (contains(r, px, py) && (!best || r.w * r.h < best.w * best.h)) best = r
    }
    if (!best) {
      // Text ragt über den Block hinaus: dem Block direkt darüber zuordnen
      best = candidates
        .filter((r) => px >= r.x && px <= r.x + r.w && py >= r.y + r.h - 0.5 && py - (r.y + r.h) < z.size * 1.3)
        .sort((a, b) => b.y + b.h - (a.y + a.h))[0]
    }
    if (best) {
      if (!assignments.has(best)) assignments.set(best, [])
      assignments.get(best)!.push(z)
    }
  }

  const categoryColors = new Map(result.categories.map((k) => [k.color.toUpperCase(), k.short]))
  const known = new Set(result.categories.map((k) => k.short))

  // Im alten Druck wird Text nicht abgeschnitten: Er läuft von kleinen Blöcken in den
  // nächsten Block hinein. Text oberhalb des eigenen Titels gehört zum Block darüber.
  const blockLines = new Map<Rect, Line[]>()
  for (const [r, items] of assignments) blockLines.set(r, toLines(items))
  const moves: { from: Rect; to: Rect; line: Line }[] = []
  for (const [r, zl] of blockLines) {
    const sorted = [...zl].sort((a, b) => a.y - b.y || a.x - b.x)
    const title = sorted.find((z) => !isShortCodeLine(z) && isTitleStart(z.str, known))
    if (!title) continue
    for (const z of sorted) {
      if (z.y >= title.y - 1) break
      const above = [...blockLines.keys()]
        .filter((o) => o !== r && z.x >= o.x - 1 && z.x <= o.x + o.w && o.y + o.h <= r.y + 1.5 && o.y < z.y)
        .sort((a, b) => b.y + b.h - (a.y + a.h))[0]
      if (above) moves.push({ from: r, to: above, line: z })
    }
  }
  for (const v of moves) {
    blockLines.set(v.from, blockLines.get(v.from)!.filter((z) => z !== v.line))
    blockLines.get(v.to)!.push(v.line)
  }
  const blockRects: Rect[] = []
  for (const r of candidates) {
    const z = blockLines.get(r)
    if (z?.length) {
      blockRects.push(r)
      continue
    }
    // Block ohne lesbaren Text, aber in einer Kategoriefarbe
    if (categoryColors.has(r.color.toUpperCase()) && !blockRects.some((b) => overlap(b, r) > 0.6)) {
      if (!candidates.some((o) => o !== r && blockLines.get(o)?.length && overlap(o, r) > 0.6)) blockRects.push(r)
    }
  }

  for (const r of blockRects) {
    const midX = r.x + r.w / 2
    const column = columns.find((s) => midX >= s.left && midX <= s.right)
    if (!column) continue
    const z = blockLines.get(r) ?? []
    const shortCodes = z.filter(isShortCodeLine)
    const textLines = z.filter((x) => !isShortCodeLine(x))
    const parts = splitBlockText(blockText(textLines, r), known)
    let category = parts.category
    if (!category || !known.has(category)) {
      const byColor = categoryColors.get(r.color.toUpperCase())
      if (byColor) category = byColor
    }
    const responsible = parts.responsible ?? (shortCodes.length ? shortCodes.map((k) => k.str).join(' ') : undefined)
    result.blocks.push({
      date: column.date,
      start: round(axis.minutesFor(r.y)),
      end: round(axis.minutesFor(r.y + r.h)),
      number: parts.number,
      category,
      title: parts.title,
      responsible,
      color: r.color.toUpperCase(),
    })
  }

  // Kopf- und Fusszeile (nur einmal)
  if (!result.title) {
    const title = lines.filter((z) => z.y < headY).sort((a, b) => b.size - a.size)[0]
    if (title) {
      result.title = title.str
      result.section = title.str.replace(/^Grobprogramm\s*/i, '') || undefined
      const group = lines
        .filter((z) => z !== title && z.y < headY - 5 && z.x > page.width / 2 && !TIME_RE.test(z.str) && !DATE_RE.test(z.str))
        .sort((a, b) => a.y - b.y)[0]
      if (group) result.group = group.str
    }
  }
  if (!result.lead && legend.categories.length) {
    const footer = lines.filter((z) => z.y > legend.y + 3).sort((a, b) => a.y - b.y || a.x - b.x)
    const leftColumn = footer.filter((z) => z.x < page.width * 0.3 && !DATE_RANGE_RE.test(z.str))
    const middle = footer.filter((z) => z.x >= page.width * 0.3 && z.x < page.width * 0.6 && !DATE_RANGE_RE.test(z.str) && !DATE_RE.test(z.str))
    const right = footer.filter((z) => z.x >= page.width * 0.6)
    if (leftColumn[0]) result.campName = leftColumn[0].str
    if (leftColumn[1]) result.motto = leftColumn.slice(1).map((z) => z.str).join(' ')
    if (middle.length) result.location = middle.map((z) => z.str).join(', ')
    let target: 'lead' | 'coach' | undefined
    for (const z of right) {
      const l = /^Leitung:\s*(.*)$/i.exec(z.str)
      const c = /^Coach:\s*(.*)$/i.exec(z.str)
      if (l) {
        target = 'lead'
        result.lead = l[1]
      } else if (c) {
        target = 'coach'
        result.coach = c[1]
      } else if (target) result[target] = `${result[target] ?? ''} ${z.str}`.trim()
    }
  }
}

/** Vergibt fehlende Nummern nach eCamp-Logik (Tag.Reihenfolge) nicht, prüft aber Plausibilität. */
function validate(result: ParseResult) {
  result.blocks.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start))
  const broken = result.blocks.filter((b) => b.end <= b.start)
  for (const b of broken) b.end = b.start + 15
  if (!result.blocks.length) result.warnings.push('Es wurden keine Blöcke erkannt.')
  const withoutTitle = result.blocks.filter((b) => !b.title).length
  if (withoutTitle) result.warnings.push(`${withoutTitle} Block/Blöcke ohne lesbaren Titel – bitte ergänzen.`)
}

export function parseProgram(pages: PageData[]): ParseResult {
  const result: ParseResult = { categories: [], days: [], blocks: [], warnings: [] }
  pages.forEach((s, i) => parsePage(s, result, i + 1))
  result.days.sort((a, b) => (a.date < b.date ? -1 : 1))
  validate(result)
  return result
}
