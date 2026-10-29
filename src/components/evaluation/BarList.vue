<script setup lang="ts">
// Horizontale Balken pro Beziehung bzw. Methode (Bildschirm und Druck)
import { computed } from 'vue'
import type { ElementEvaluation } from '@/utils/evaluation'
import { hours } from '@/utils/time'

const props = defineProps<{ entries: ElementEvaluation[]; selected?: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()

const max = computed(() => Math.max(1, ...props.entries.map((e) => e.count)))
</script>

<template>
  <div class="liste">
    <button
      v-for="e in entries"
      :key="e.element.id"
      type="button"
      class="zeile"
      :class="{ gewaehlt: selected === e.element.id }"
      @click="emit('select', e.element.id)"
    >
      <img :src="e.element.icon" alt="" class="icon" />
      <span class="name">{{ e.element.short }}</span>
      <span class="balken-spur">
        <span
          class="balken"
          :style="{
            width: `${(e.count / max) * 100}%`,
            background: e.element.color,
            borderColor: e.element.ink,
          }"
        />
      </span>
      <span class="zahlen">
        <b>{{ e.count }}</b> <span class="einheit">{{ e.count === 1 ? 'Block' : 'Blöcke' }}</span>
        <span class="stunden">{{ hours(e.minutes) }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.liste {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.zeile {
  display: grid;
  grid-template-columns: 30px minmax(90px, 150px) 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.zeile:hover {
  background: #faf6f9;
}
.zeile.gewaehlt {
  background: #f3e9f0;
}
.icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.name {
  font-size: 0.875rem;
  font-weight: 500;
}
.balken-spur {
  height: 14px;
  background: #f4f0f3;
  border-radius: 4px;
  overflow: hidden;
}
.balken {
  display: block;
  height: 100%;
  border-radius: 4px;
  border: 1px solid;
  border-left-width: 0;
  min-width: 0;
}
.zahlen {
  font-size: 0.82rem;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  min-width: 118px;
  text-align: right;
}
.einheit {
  color: var(--text-grau);
}
.stunden {
  color: var(--text-grau);
  margin-left: 6px;
}
@media print {
  .zeile {
    grid-template-columns: 22px 130px 1fr auto;
    padding: 1px 0;
    gap: 8px;
  }
  .icon {
    width: 22px;
    height: 22px;
  }
}
</style>
