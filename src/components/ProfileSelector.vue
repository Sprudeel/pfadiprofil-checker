<script setup lang="ts">
// Kacheln zum An- und Abwählen von Beziehungen oder Methoden (mit Icon und Farbe aus dem Pfadiprofil)
import { ref } from 'vue'
import type { ProfileElement } from '@/data/profile'

const props = defineProps<{
  elements: ProfileElement<string>[]
  selected: string[]
  subPoints: string[]
  keys?: string[]
}>()
const emit = defineEmits<{
  toggle: [id: string]
  toggleSubPoint: [id: string]
}>()

const open = ref<string | null>(null)

function isActive(id: string) {
  return props.selected.includes(id)
}
</script>

<template>
  <div class="raster">
    <div v-for="(e, i) in elements" :key="e.id" class="kachel-wrap">
      <button
        type="button"
        class="kachel"
        :class="{ aktiv: isActive(e.id) }"
        :style="isActive(e.id) ? { background: e.color, borderColor: e.ink, color: '#231F20' } : {}"
        :aria-pressed="isActive(e.id)"
        :title="`${e.name} – ${e.guidingPrinciple}${keys?.[i] ? ` (Taste ${keys[i]})` : ''}`"
        @click="emit('toggle', e.id)"
      >
        <img :src="e.icon" alt="" />
        <span class="name">{{ e.short }}</span>
        <v-icon v-if="isActive(e.id)" icon="mdi-check-circle" size="16" class="haken" :color="e.ink" />
        <kbd v-if="keys?.[i]" class="taste">{{ keys[i] }}</kbd>
      </button>
      <button
        type="button"
        class="mehr"
        :class="{ sichtbar: isActive(e.id) || open === e.id }"
        :title="`Unterthemen von ${e.short}`"
        @click="open = open === e.id ? null : e.id"
      >
        <span v-if="e.subPoints.filter((u) => subPoints.includes(u.id)).length" class="zahl">
          {{ e.subPoints.filter((u) => subPoints.includes(u.id)).length }}
        </span>
        <v-icon :icon="open === e.id ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="16" />
      </button>
    </div>
  </div>
  <v-expand-transition>
    <div v-if="open" class="unterpunkte">
      <template v-for="e in elements" :key="e.id">
        <template v-if="e.id === open">
          <div class="text-caption text-medium-emphasis mb-1">{{ e.name }} · {{ e.guidingPrinciple }}</div>
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="u in e.subPoints"
              :key="u.id"
              size="small"
              :variant="subPoints.includes(u.id) ? 'flat' : 'outlined'"
              :color="subPoints.includes(u.id) ? e.ink : undefined"
              :prepend-icon="subPoints.includes(u.id) ? 'mdi-check' : undefined"
              @click="emit('toggleSubPoint', u.id)"
            >
              {{ u.name }}
            </v-chip>
          </div>
        </template>
      </template>
    </div>
  </v-expand-transition>
</template>

<style scoped>
.raster {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 6px;
}
.kachel-wrap {
  position: relative;
}
.kachel {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 6px;
  border-radius: 10px;
  border: 2px solid #e4dce2;
  background: #fff;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, transform 0.08s;
  font: inherit;
  color: #4a4548;
}
.kachel:hover {
  border-color: #c4a4c2;
}
.kachel:active {
  transform: scale(0.97);
}
.kachel:focus-visible {
  outline: 2px solid var(--brombeer);
  outline-offset: 2px;
}
.kachel img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  filter: grayscale(0.6);
  opacity: 0.75;
}
.kachel.aktiv img {
  filter: none;
  opacity: 1;
}
.name {
  font-size: 0.72rem;
  line-height: 1.15;
  text-align: center;
  font-weight: 500;
  min-height: 2.3em;
  display: flex;
  align-items: center;
}
.kachel.aktiv .name {
  font-weight: 600;
}
.haken {
  position: absolute;
  top: 4px;
  right: 4px;
}
.taste {
  position: absolute;
  top: 4px;
  left: 5px;
  font-size: 0.62rem;
  font-family: inherit;
  color: #9a8f96;
  font-weight: 600;
}
.mehr {
  position: absolute;
  bottom: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6d6e71;
  opacity: 0;
  padding: 0 2px;
}
.kachel-wrap:hover .mehr,
.mehr.sichtbar {
  opacity: 1;
}
.mehr .zahl {
  font-size: 0.65rem;
  font-weight: 700;
}
.unterpunkte {
  margin-top: 8px;
  padding: 10px;
  background: #faf6f9;
  border-radius: 10px;
}
</style>
