<script setup lang="ts">
// Welche Methode wurde für welche Beziehung eingesetzt? (Anzahl Blöcke)
import { computed } from 'vue'
import { RELATIONSHIPS, METHODS } from '@/data/profile'
import { withAlpha } from '@/utils/file'

const props = defineProps<{ matrix: number[][] }>()
const max = computed(() => Math.max(1, ...props.matrix.flat()))

function background(n: number) {
  if (!n) return 'transparent'
  return withAlpha('#84456E', 0.12 + (n / max.value) * 0.78)
}
function ink(n: number) {
  return n / max.value > 0.5 ? '#fff' : '#231F20'
}
</script>

<template>
  <div class="matrix-wrap">
    <table class="matrix">
      <thead>
        <tr>
          <th class="ecke"></th>
          <th v-for="m in METHODS" :key="m.id" :title="m.name">
            <img :src="m.icon" alt="" />
            <span>{{ m.short }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(b, i) in RELATIONSHIPS" :key="b.id">
          <th class="zeilenkopf" :title="b.name">
            <img :src="b.icon" alt="" />
            <span>{{ b.short }}</span>
          </th>
          <td
            v-for="(m, j) in METHODS"
            :key="m.id"
            :style="{ background: background(matrix[i][j]), color: ink(matrix[i][j]) }"
            :title="`${b.short} × ${m.name}: ${matrix[i][j]} Blöcke`"
          >
            {{ matrix[i][j] || '·' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.matrix-wrap {
  overflow-x: auto;
}
.matrix {
  border-collapse: separate;
  border-spacing: 3px;
  width: 100%;
  font-size: 0.8rem;
}
.matrix thead th {
  font-weight: 500;
  vertical-align: bottom;
  padding: 2px;
  width: 11%;
}
.matrix thead th img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
  margin: 0 auto 2px;
}
.matrix thead th span {
  display: block;
  font-size: 0.68rem;
  line-height: 1.15;
  text-align: center;
}
.zeilenkopf {
  text-align: left;
  font-weight: 500;
  white-space: nowrap;
  padding-right: 6px;
}
.zeilenkopf img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  vertical-align: middle;
  margin-right: 6px;
}
.matrix td {
  text-align: center;
  border-radius: 6px;
  height: 32px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border: 1px solid #efe8ed;
}
@media print {
  .matrix td {
    height: 22px;
  }
  .matrix thead th img {
    width: 20px;
    height: 20px;
  }
  .zeilenkopf img {
    width: 18px;
    height: 18px;
  }
}
</style>
