<script setup lang="ts">
// Wann wurde was gefördert? Zeilen = Beziehungen/Methoden, Spalten = Tage.
import { computed } from 'vue'
import type { ProfileElement } from '@/data/profile'
import { shortDate } from '@/utils/time'

const props = defineProps<{
  days: string[]
  perDay: Record<string, Record<string, number>>
  groups: { title: string; elements: ProfileElement<string>[] }[]
}>()

const max = computed(() => Math.max(1, ...Object.values(props.perDay).flatMap((t) => Object.values(t))))

function size(n: number) {
  return 8 + Math.sqrt(n / max.value) * 14
}
</script>

<template>
  <div class="strahl-wrap">
    <table class="strahl">
      <thead>
        <tr>
          <th class="ecke"></th>
          <th v-for="d in days" :key="d" class="tag">{{ shortDate(d) }}</th>
        </tr>
      </thead>
      <tbody v-for="g in groups" :key="g.title">
        <tr class="gruppe">
          <td :colspan="days.length + 1">{{ g.title }}</td>
        </tr>
        <tr v-for="e in g.elements" :key="e.id">
          <th class="name">
            <img :src="e.icon" alt="" />
            <span>{{ e.short }}</span>
          </th>
          <td v-for="d in days" :key="d" :title="`${e.short}, ${shortDate(d)}: ${perDay[d]?.[e.id] ?? 0}`">
            <span
              v-if="perDay[d]?.[e.id]"
              class="punkt"
              :style="{
                width: size(perDay[d][e.id]) + 'px',
                height: size(perDay[d][e.id]) + 'px',
                background: e.color,
                borderColor: e.ink,
              }"
              >{{ perDay[d][e.id] > 1 ? perDay[d][e.id] : '' }}</span
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.strahl-wrap {
  overflow-x: auto;
}
.strahl {
  border-collapse: collapse;
  font-size: 0.78rem;
  min-width: 100%;
}
.strahl th.tag {
  font-weight: 500;
  white-space: nowrap;
  padding: 4px 6px;
  color: var(--text-grau);
  font-size: 0.72rem;
}
.strahl tr.gruppe td {
  text-align: left;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brombeer);
  padding: 10px 0 2px;
}
.name {
  text-align: left;
  font-weight: 500;
  white-space: nowrap;
  padding: 2px 10px 2px 0;
}
.name img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  vertical-align: middle;
  margin-right: 6px;
}
.strahl td {
  text-align: center;
  border-left: 1px solid #f1ebef;
  height: 28px;
  min-width: 40px;
}
.punkt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1.5px solid;
  font-size: 0.62rem;
  font-weight: 700;
  color: #231f20;
  vertical-align: middle;
}
@media print {
  .strahl td {
    height: 18px;
    min-width: 0;
  }
  .name img {
    width: 14px;
    height: 14px;
  }
}
</style>
