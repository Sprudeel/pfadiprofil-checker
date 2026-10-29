// Testet den Grobprogramm-Parser mit den Beispiel-PDFs: npm run test:parser [datei.pdf]
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { extractPages } from '../src/parser/extract'
import { parseProgram } from '../src/parser/ecamp'
import { minutesToTime } from '../src/utils/time'

const dir = 'context/grobprogramme'
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')).map((f) => path.join(dir, f))

for (const f of files) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)), verbosity: 0 }).promise
  const pages = await extractPages(doc as never, pdfjs.OPS as unknown as Record<string, number>)
  const r = parseProgram(pages)
  console.log(`\n===== ${path.basename(f)}`)
  console.log({ title: r.title, group: r.group, camp: r.campName, motto: r.motto, location: r.location, lead: r.lead, coach: r.coach })
  console.log('Kategorien:', r.categories.map((k) => `${k.short}=${k.name} ${k.color}`).join(' | '))
  console.log('Tage:', r.days.map((t) => `${t.date} (${t.responsible ?? '-'})`).join(', '))
  for (const w of r.warnings) console.log('WARNUNG:', w)
  for (const b of r.blocks)
    console.log(`  ${b.date} ${minutesToTime(b.start)}-${minutesToTime(b.end)}${b.end > 1440 ? '+' : ''} ${(b.number ?? '').padEnd(5)} ${(b.category ?? '?').padEnd(7)} ${b.title}${b.responsible ? '  [' + b.responsible + ']' : ''}`)
}
