<script setup lang="ts">
// Wo genau wurde eine Beziehung/Methode eingesetzt? Blöcke und Unterthemen.
import type { ElementEvaluation } from '@/utils/evaluation'
import type { Category } from '@/types'
import { shortDate, minutesToTime } from '@/utils/time'
import { textColor } from '@/utils/file'

defineProps<{ entry: ElementEvaluation; categories: Category[]; compact?: boolean }>()
const emit = defineEmits<{ open: [id: string] }>()
</script>

<template>
  <div class="verwendung">
    <div class="kopf">
      <img :src="entry.element.icon" alt="" />
      <div>
        <div class="name">{{ entry.element.chapter }} {{ entry.element.name }}</div>
        <div class="leitsatz">{{ entry.element.guidingPrinciple }}</div>
      </div>
      <div class="zusammenfassung">
        {{ entry.count }} {{ entry.count === 1 ? 'Block' : 'Blöcke' }} · {{ entry.occurrenceDaysCount }}
        {{ entry.occurrenceDaysCount === 1 ? 'Tag' : 'Tage' }}
      </div>
    </div>

    <div class="unterpunkte">
      <span
        v-for="u in entry.subPoints"
        :key="u.id"
        class="up"
        :class="{ benutzt: u.count > 0 }"
        :style="u.count ? { background: entry.element.lightColor, borderColor: entry.element.ink } : {}"
      >
        {{ u.name }} <b v-if="u.count"> {{ u.count }}</b>
      </span>
    </div>

    <table v-if="entry.blocks.length" class="bloecke">
      <tbody>
        <tr v-for="b in entry.blocks" :key="b.id" :class="{ klickbar: !compact }" @click="emit('open', b.id)">
          <td class="datum">{{ shortDate(b.date) }}</td>
          <td class="zeit">{{ minutesToTime(b.start) }}–{{ minutesToTime(b.end) }}</td>
          <td class="nr">
            <span
              v-if="b.category"
              class="kat"
              :style="{
                background: categories.find((k) => k.short === b.category)?.color ?? '#ddd',
                color: textColor(categories.find((k) => k.short === b.category)?.color ?? '#dddddd'),
              }"
              >{{ b.category }}</span
            >
            {{ b.number }}
          </td>
          <td class="titel">
            {{ b.title || 'Ohne Titel' }}
            <span v-if="b.location" class="ort"> · {{ b.location }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="leer">Noch in keinem Block eingesetzt.</div>
  </div>
</template>

<style scoped>
.verwendung {
  break-inside: avoid-page;
}
.kopf {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.kopf img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}
.name {
  font-weight: 600;
}
.leitsatz {
  font-size: 0.78rem;
  color: var(--text-grau);
}
.zusammenfassung {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--text-grau);
  white-space: nowrap;
}
.unterpunkte {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.up {
  font-size: 0.72rem;
  border: 1px dashed #c9bdc6;
  border-radius: 6px;
  padding: 1px 6px;
  color: var(--text-grau);
}
.up.benutzt {
  border-style: solid;
  color: #231f20;
}
.bloecke {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.bloecke td {
  padding: 3px 6px;
  border-top: 1px solid #f1ebef;
  vertical-align: top;
}
.bloecke tr.klickbar {
  cursor: pointer;
}
.bloecke tr.klickbar:hover td {
  background: #faf6f9;
}
.datum,
.zeit {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--text-grau);
  width: 1%;
}
.nr {
  white-space: nowrap;
  width: 1%;
}
.kat {
  border-radius: 4px;
  padding: 0 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-right: 2px;
}
.ort {
  color: var(--text-grau);
}
.leer {
  font-size: 0.8rem;
  color: #b3261e;
}
@media print {
  .kopf img {
    width: 24px;
    height: 24px;
  }
  .bloecke {
    font-size: 8pt;
  }
  .bloecke td {
    padding: 1px 4px;
  }
  .bloecke tr {
    break-inside: avoid;
  }
}
</style>
