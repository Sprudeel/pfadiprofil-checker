<script setup lang="ts">
// Logo: der Spielweg vom Titelbild des Pfadiprofils, mit farbigen Stationen
// (Farben aus dem Pfadiprofil) und einem Häkchen am Ziel.
withDefaults(defineProps<{ size?: number | string; background?: string | null }>(), {
  size: 32,
  background: '#84456E',
})

const PATH = 'M12 50 H40 A8 8 0 0 0 40 34 H24 A8 8 0 0 1 24 18 H41'
// Feld k liegt zwischen den Trennstrichen bei 3 + 6.4·k und 3 + 6.4·(k+1)
const STATIONS: [number, string][] = [
  [2, '#E59155'],
  [5, '#C4A4C2'],
  [9, '#EBC572'],
  [12, '#81A3D5'],
  [15, '#84A389'],
]
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pfadiprofil-Checker">
    <rect v-if="background" width="64" height="64" rx="15" :fill="background" />
    <path :d="PATH" fill="none" stroke="#231F20" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
    <path :d="PATH" fill="none" stroke="#A1D9D4" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round" />
    <path
      v-for="[k, color] in STATIONS"
      :key="k"
      :d="PATH"
      fill="none"
      :stroke="color"
      stroke-width="8.4"
      stroke-dasharray="5.4 400"
      :stroke-dashoffset="-(4 + 6.4 * k)"
    />
    <path :d="PATH" fill="none" stroke="#231F20" stroke-width="8.4" stroke-dasharray="1 5.4" stroke-dashoffset="-3" />
    <circle cx="12" cy="50" r="2" fill="#fff" />
    <circle cx="48" cy="18" r="9" fill="#EBC572" stroke="#231F20" stroke-width="2.2" />
    <path d="M43.8 18.2 l3 3 l5.6 -6.2" fill="none" stroke="#231F20" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
