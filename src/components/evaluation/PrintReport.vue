<script setup lang="ts">
// Druckversion der Übersicht (A4 hoch). Wird nur beim Drucken / «Als PDF speichern» angezeigt.
import type { Evaluation } from '@/utils/evaluation'
import type { Program } from '@/types'
import { RELATIONSHIPS, METHODS, type ProfileElement } from '@/data/profile'
import AppLogo from '../AppLogo.vue'
import BarList from './BarList.vue'
import MatrixTable from './MatrixTable.vue'
import Timeline from './Timeline.vue'
import UsageList from './UsageList.vue'
import { shortDate, longDate, minutesToTime, hours } from '@/utils/time'

defineProps<{ program: Program; evaluation: Evaluation; excluded: string[] }>()

const groups = [
  { title: 'Beziehungen', elements: RELATIONSHIPS as unknown as ProfileElement<string>[] },
  { title: 'Methoden', elements: METHODS as unknown as ProfileElement<string>[] },
]
const created = longDate(new Date().toISOString().slice(0, 10))
</script>

<template>
  <div class="bericht">
    <header class="titelband">
      <AppLogo :size="46" background="#5C264A" class="logo" />
      <div class="flex">
        <div class="ueber">Pfadiprofil-Auswertung</div>
        <h1>{{ program.name }}</h1>
        <div class="meta">
          {{ [program.group, program.level, program.motto].filter(Boolean).join(' · ') }}
        </div>
      </div>
      <div class="rechts">
        <div v-if="evaluation.days.length">{{ shortDate(evaluation.days[0]) }} – {{ shortDate(evaluation.days[evaluation.days.length - 1]) }}{{ evaluation.days[evaluation.days.length - 1].slice(0, 4) }}</div>
        <div v-if="program.lead">Leitung: {{ program.lead }}</div>
        <div v-if="program.coach">Coach: {{ program.coach }}</div>
      </div>
    </header>

    <section class="kennzahlen">
      <div><b>{{ evaluation.blocks.length }}</b><span>Blöcke</span></div>
      <div><b>{{ hours(evaluation.totalMinutes) }}</b><span>Programmzeit</span></div>
      <div><b>{{ evaluation.assigned.length }}</b><span>mit Zuordnung</span></div>
      <div><b>{{ evaluation.days.length }}</b><span>Tage</span></div>
    </section>
    <p v-if="excluded.length" class="hinweis-klein">Nicht berücksichtigt: Kategorien {{ excluded.join(', ') }}.</p>

    <section v-if="evaluation.notes.length" class="hinweise">
      <div v-for="h in evaluation.notes" :key="h.text" class="hinweis" :class="h.kind">{{ h.text }}</div>
    </section>

    <div class="zwei">
      <section class="zusammen">
        <h2>Beziehungen</h2>
        <BarList :entries="evaluation.relationships" />
      </section>
      <section class="zusammen">
        <h2>Methoden</h2>
        <BarList :entries="evaluation.methods" />
      </section>
    </div>

    <section class="zusammen">
      <h2>Beziehungen × Methoden</h2>
      <MatrixTable :matrix="evaluation.matrix" />
    </section>

    <section class="seitenumbruch zusammen">
      <h2>Verlauf über die Tage</h2>
      <Timeline :days="evaluation.days" :per-day="evaluation.perDay" :groups="groups" />
    </section>

    <section>
      <h2>Wo wurde was eingesetzt?</h2>
      <div class="verwendungen">
        <UsageList v-for="e in evaluation.relationships" :key="e.element.id" :entry="e" :categories="program.categories" compact />
        <UsageList v-for="e in evaluation.methods" :key="e.element.id" :entry="e" :categories="program.categories" compact />
      </div>
    </section>

    <section v-if="evaluation.unassigned.length">
      <h2>Blöcke ohne Zuordnung ({{ evaluation.unassigned.length }})</h2>
      <table class="ohne">
        <tbody>
          <tr v-for="b in evaluation.unassigned" :key="b.id">
            <td>{{ shortDate(b.date) }}</td>
            <td>{{ minutesToTime(b.start) }}–{{ minutesToTime(b.end) }}</td>
            <td>{{ [b.category, b.number].filter(Boolean).join(' ') }}</td>
            <td>{{ b.title || 'Ohne Titel' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <footer>Erstellt am {{ created }} mit dem Pfadiprofil-Checker · Grundlage: Pfadiprofil der Pfadibewegung Schweiz (2025)</footer>
  </div>
</template>

<style scoped>
.bericht {
  font-size: 10pt;
  color: #231f20;
}
.titelband {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #84456e;
  color: #fff;
  padding: 14px 18px;
  border-radius: 6px;
  margin-bottom: 12px;
}
.titelband .flex {
  flex: 1;
}
.logo {
  flex: none;
}
.ueber {
  font-size: 8pt;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}
.titelband h1 {
  font-size: 18pt;
  margin: 2px 0;
  font-weight: 600;
}
.meta,
.rechts {
  font-size: 9pt;
  opacity: 0.9;
}
.rechts {
  text-align: right;
}
.kennzahlen {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 6px;
}
.kennzahlen div {
  border: 1px solid #e4dce2;
  border-radius: 6px;
  padding: 6px 10px;
}
.kennzahlen b {
  display: block;
  font-size: 14pt;
  color: #5c264a;
}
.kennzahlen span {
  font-size: 8pt;
  color: #6d6e71;
}
.hinweis-klein {
  font-size: 8pt;
  color: #6d6e71;
  margin: 0 0 6px;
}
.hinweise {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 8px 0 4px;
}
.hinweis {
  padding: 4px 10px;
  border-radius: 4px;
  border-left: 4px solid #81a3d5;
  background: #f1f5fb;
}
.hinweis.missing {
  border-color: #b3261e;
  background: #fbeceb;
}
.hinweis.low {
  border-color: #e59155;
  background: #fdf3ea;
}
.hinweis.good {
  border-color: #4c6b47;
  background: #eef4ec;
}
h2 {
  font-size: 11pt;
  color: #84456e;
  border-bottom: 1.5px solid #84456e;
  padding-bottom: 2px;
  margin: 14px 0 6px;
}
.zwei {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}
section.zusammen {
  break-inside: avoid;
}
.seitenumbruch {
  break-before: page;
}
.verwendungen {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ohne {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
}
.ohne td {
  padding: 1px 4px;
  border-top: 1px solid #f1ebef;
}
footer {
  margin-top: 16px;
  font-size: 7.5pt;
  color: #6d6e71;
  border-top: 1px solid #e4dce2;
  padding-top: 4px;
}
</style>
