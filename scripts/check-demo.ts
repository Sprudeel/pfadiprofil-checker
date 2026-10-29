// Prüft die Demo-Daten: gültige Unterpunkte mit passender Beziehung/Methode; nur Essen darf ohne Zuordnung sein
import { demoProgram } from '../src/data/demo'
import { SUBPOINT_BY_ID } from '../src/data/profile'
import { evaluateProgram } from '../src/utils/evaluation'

const p = demoProgram()
let errors = 0
for (const b of p.blocks) {
  for (const u of b.subPoints) {
    const info = SUBPOINT_BY_ID[u]
    if (!info) { console.log('Unbekannt:', b.number, u); errors++; continue }
    if (![...b.relationships, ...b.methods].includes(info.parent as never)) { console.log('Elternteil fehlt:', b.number, b.title, u); errors++ }
  }
  if (!b.relationships.length && !b.methods.length && b.category !== 'ES') { console.log('Ohne Zuordnung:', b.number, b.title); errors++ }
}
const a = evaluateProgram(p)
console.log('Blöcke', a.blocks.length, 'zugeordnet', a.assigned.length)
for (const e of [...a.relationships, ...a.methods]) console.log(e.status.padEnd(6), String(e.count).padStart(3), (e.minutes / 60).toFixed(1).padStart(5) + 'h', e.element.short, '| Unterpunkte ungenutzt:', e.subPoints.filter((u) => !u.count).map((u) => u.name).join(', ') || '-')
console.log(a.notes.map((h) => h.text))
console.log(errors ? `${errors} Fehler` : 'OK')
