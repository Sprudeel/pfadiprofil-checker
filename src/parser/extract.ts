// Liest aus einem PDF (über pdf.js) die farbigen Rechtecke und die Texte mit Position.
// Funktioniert im Browser und in Node (für Tests), deshalb wird pdf.js hereingereicht.

import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
  color: string
}

export interface TextItem {
  x: number
  /** Grundlinie, von oben gemessen */
  y: number
  w: number
  size: number
  str: string
}

export interface PageData {
  width: number
  height: number
  rects: Rect[]
  texts: TextItem[]
}

type Matrix = [number, number, number, number, number, number]

function mul(m: Matrix, n: number[]): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

/**
 * Chrome (Skia) speichert einige Zeichen von eCamp (Ziffern, Punkt, Komma …) ohne
 * Unicode-Zuordnung. pdf.js legt sie in den Private-Use-Bereich. Diese Tabelle
 * ordnet sie wieder zu (ermittelt an echten eCamp-Exporten).
 */
export const PUA_CHARS: Record<number, string> = {
  0xe071: '0',
  0xe072: '1',
  0xe073: '2',
  0xe074: '3',
  0xe075: '4',
  0xe076: '5',
  0xe077: '6',
  0xe078: '7',
  0xe079: '8',
  0xe07a: '9',
  0xe093: ',',
  0xe094: '.',
  0xe095: ':',
  0xe083: '[',
  0xe088: '–',
  0xe1d7: '→',
}

export function replacePuaChars(s: string): string {
  let out = ''
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0xe000 && cp <= 0xf8ff) out += PUA_CHARS[cp] ?? ''
    else out += ch
  }
  return out
}

function hex(v: unknown): string {
  if (typeof v === 'string') return v.toLowerCase()
  if (Array.isArray(v) || ArrayBuffer.isView(v)) {
    const a = Array.from(v as ArrayLike<number>)
    const scale = a.some((x) => x > 1) ? 1 : 255
    return '#' + a.slice(0, 3).map((x) => Math.round(x * scale).toString(16).padStart(2, '0')).join('')
  }
  return ''
}

export async function extractPages(doc: PDFDocumentProxy, OPS: Record<string, number>): Promise<PageData[]> {
  const pages: PageData[] = []
  const fillOps = new Set([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke])

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const [vx0, vy0, vx1, vy1] = page.view
    const height = vy1 - vy0
    const width = vx1 - vx0
    const ops = await page.getOperatorList()

    const rects: Rect[] = []
    let ctm: Matrix = [1, 0, 0, 1, 0, 0]
    let color = ''
    const stack: [Matrix, string][] = []

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i]
      const args = ops.argsArray[i] as unknown[]
      if (fn === OPS.save) stack.push([ctm, color])
      else if (fn === OPS.restore) [ctm, color] = stack.pop() ?? [ctm, color]
      else if (fn === OPS.transform) ctm = mul(ctm, args as number[])
      else if (fn === OPS.paintFormXObjectBegin) {
        stack.push([ctm, color])
        const m = args?.[0] as number[] | undefined
        if (m && m.length === 6) ctm = mul(ctm, Array.from(m))
      } else if (fn === OPS.paintFormXObjectEnd) [ctm, color] = stack.pop() ?? [ctm, color]
      else if (fn === OPS.setFillRGBColor) color = hex(args.length === 1 ? args[0] : args)
      else if (fn === OPS.setFillGray) {
        const g = Math.round(Number(args[0]) * 255)
        color = '#' + g.toString(16).padStart(2, '0').repeat(3)
      } else if (fn === OPS.constructPath) {
        // pdf.js ≥ 4.x: [paintOp, [pfad], minMax]
        const paintOp = args[0] as number
        const minMax = args[2] as ArrayLike<number> | null
        if (!fillOps.has(paintOp) || !minMax || minMax.length < 4) continue
        const [x0, y0, x1, y1] = [minMax[0], minMax[1], minMax[2], minMax[3]]
        if (!Number.isFinite(x0) || !Number.isFinite(y1)) continue
        const pts = [
          [x0, y0],
          [x1, y1],
          [x0, y1],
          [x1, y0],
        ].map(([x, y]) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]])
        const xs = pts.map((p) => p[0])
        const ys = pts.map((p) => p[1])
        const minX = Math.min(...xs) - vx0
        const maxY = Math.max(...ys) - vy0
        rects.push({
          x: minX,
          y: height - maxY,
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
          color,
        })
      }
    }

    const tc = await page.getTextContent()
    const texts: TextItem[] = []
    for (const item of tc.items) {
      if (!('str' in item)) continue
      const str = replacePuaChars(item.str)
      if (!str.trim()) continue
      const t = item.transform as number[]
      const size = Math.hypot(t[2], t[3]) || Math.abs(t[0])
      texts.push({ x: t[4] - vx0, y: height - (t[5] - vy0), w: item.width, size, str })
    }

    pages.push({ width, height, rects, texts })
  }
  return pages
}
