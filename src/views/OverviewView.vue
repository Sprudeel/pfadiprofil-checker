<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProgramStore } from '@/stores/program'
import { useUiStore } from '@/stores/ui'
import { RELATIONSHIPS, METHODS, type ProfileElement } from '@/data/profile'
import { evaluateProgram } from '@/utils/evaluation'
import BarList from '@/components/evaluation/BarList.vue'
import MatrixTable from '@/components/evaluation/MatrixTable.vue'
import Timeline from '@/components/evaluation/Timeline.vue'
import UsageList from '@/components/evaluation/UsageList.vue'
import PrintReport from '@/components/evaluation/PrintReport.vue'
import { hours } from '@/utils/time'
import { textColor } from '@/utils/file'

const store = useProgramStore()
const ui = useUiStore()
const router = useRouter()
const program = computed(() => store.active!)

const excluded = computed(() => ui.excludedFor(program.value.id))
function toggleCategory(short: string) {
  ui.toggleCategory(program.value.id, short)
}

const evaluation = computed(() => evaluateProgram(program.value, excluded.value))
const selected = ref<string>('personality')
const detail = computed(() => [...evaluation.value.relationships, ...evaluation.value.methods].find((e) => e.element.id === selected.value))
watch(
  () => program.value.id,
  () => (selected.value = 'personality'),
)

const groups = [
  { title: 'Beziehungen', elements: RELATIONSHIPS as unknown as ProfileElement<string>[] },
  { title: 'Methoden', elements: METHODS as unknown as ProfileElement<string>[] },
]

const share = computed(() => (evaluation.value.blocks.length ? Math.round((evaluation.value.assigned.length / evaluation.value.blocks.length) * 100) : 0))

function openBlock(id: string) {
  const b = program.value.blocks.find((x) => x.id === id)
  if (!b) return
  ui.date = b.date
  ui.selected = id
  router.push({ name: 'calendar' })
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="seite">
    <div class="screen-only">
      <v-card elevation="0" border class="mb-4">
        <div class="kopfzeile">
          <h1>Übersicht</h1>
          <div class="text-h6 font-weight-regular text-truncate flex-grow-1 text-center d-none d-md-block">{{ program.name }}</div>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-file-pdf-box" @click="printReport">Als PDF speichern</v-btn>
        </div>
        <div class="filterzeile">
          <span class="text-body-2 text-medium-emphasis mr-1">Berücksichtigte Kategorien:</span>
          <button
            v-for="k in program.categories"
            :key="k.short"
            type="button"
            class="kat-filter"
            :class="{ aus: excluded.includes(k.short) }"
            :style="excluded.includes(k.short) ? {} : { background: k.color, color: textColor(k.color) }"
            :title="`${k.name} ${excluded.includes(k.short) ? 'einblenden' : 'ausblenden'}`"
            @click="toggleCategory(k.short)"
          >
            {{ k.short }}
          </button>
          <span class="text-body-2 text-medium-emphasis mr-1 font-italic">(Klicke auf Kategorien, um sie ein- oder auszublenden)</span>
        </div>
      </v-card>

      <div class="kacheln mb-4">
        <v-card elevation="0" border class="kachel">
          <div class="wert">{{ evaluation.blocks.length }}</div>
          <div class="label">Blöcke an {{ evaluation.days.length }} Tagen, insgesamt: {{ hours(evaluation.totalMinutes) }}</div>
        </v-card>
        <v-card elevation="0" border class="kachel">
          <div class="wert">{{ share }}%</div>
          <div class="label">{{ evaluation.assigned.length }} Blöcke mit Zuordnung</div>
          <v-progress-linear :model-value="share" color="primary" bg-color="#E9E1E7" height="6" rounded class="mt-2" />
        </v-card>
        <v-card elevation="0" border class="kachel">
          <div class="wert">
            {{ evaluation.relationships.filter((b) => b.count).length }}/5
          </div>
          <div class="label">Beziehungen genutzt</div>
        </v-card>
        <v-card elevation="0" border class="kachel">
          <div class="wert">
            {{ evaluation.methods.filter((m) => m.count).length }}/8
          </div>
          <div class="label">Methoden genutzt</div>
        </v-card>
      </div>

      <div v-if="evaluation.notes.length" class="d-flex flex-column ga-2 mb-4">
        <v-alert
          v-for="h in evaluation.notes"
          :key="h.text"
          :type="h.kind === 'missing' ? 'error' : h.kind === 'low' ? 'warning' : h.kind === 'good' ? 'success' : 'info'"
          variant="tonal"
          density="compact"
          :icon="
            h.kind === 'missing'
              ? 'mdi-alert-circle-outline'
              : h.kind === 'low'
                ? 'mdi-alert-outline'
                : h.kind === 'good'
                  ? 'mdi-check-circle-outline'
                  : 'mdi-information-outline'
          "
          >{{ h.text }}</v-alert
        >
      </div>

      <v-row>
        <v-col cols="12" lg="6">
          <v-card elevation="0" border class="pa-4 h-100">
            <h2 class="abschnitt-titel">Beziehungen</h2>
            <BarList :entries="evaluation.relationships" :selected="selected" @select="selected = $event" />
          </v-card>
        </v-col>
        <v-col cols="12" lg="6">
          <v-card elevation="0" border class="pa-4 h-100">
            <h2 class="abschnitt-titel">Methoden</h2>
            <BarList :entries="evaluation.methods" :selected="selected" @select="selected = $event" />
          </v-card>
        </v-col>

        <v-col cols="12" lg="5">
          <v-card elevation="0" border class="pa-4 h-100">
            <h2 class="abschnitt-titel">Wo genau? (Element oben anklicken)</h2>
            <UsageList v-if="detail" :entry="detail" :categories="program.categories" @open="openBlock" />
          </v-card>
        </v-col>
        <v-col cols="12" lg="7">
          <v-card elevation="0" border class="pa-4 mb-4">
            <h2 class="abschnitt-titel">Beziehungen × Methoden</h2>
            <MatrixTable :matrix="evaluation.matrix" />
          </v-card>
          <v-card elevation="0" border class="pa-4">
            <h2 class="abschnitt-titel">Verlauf über die Tage</h2>
            <Timeline :days="evaluation.days" :per-day="evaluation.perDay" :groups="groups" />
          </v-card>
        </v-col>
      </v-row>
    </div>

    <div class="print-only">
      <PrintReport :program="program" :evaluation="evaluation" :excluded="excluded" />
    </div>
  </div>
</template>

<style scoped>
.filterzeile {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
}
.kat-filter {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  padding: 2px 8px;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.kat-filter.aus {
  background: #fff;
  color: #9a8f96;
  text-decoration: line-through;
  border-style: dashed;
}
.kacheln {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.kachel {
  padding: 16px 20px;
}
.wert {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--brombeer-dunkel);
  font-variant-numeric: tabular-nums;
}
.label {
  font-size: 0.85rem;
  color: var(--text-grau);
}
</style>
