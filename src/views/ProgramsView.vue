<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProgramStore } from '@/stores/program'
import { useUiStore } from '@/stores/ui'
import { RELATIONSHIPS, METHODS } from '@/data/profile'
import PdfImportDialog from '@/components/PdfImportDialog.vue'
import ProgramDialog from '@/components/ProgramDialog.vue'
import AppLogo from '@/components/AppLogo.vue'
import { DEMO_ID, DEMO_EXCLUDED_CATEGORIES } from '@/data/demo'
import { progress } from '@/utils/evaluation'
import { shortDate } from '@/utils/time'
import type { Program } from '@/types'

const store = useProgramStore()
const ui = useUiStore()
const router = useRouter()

const pdfOpen = ref(false)
const pdfTarget = ref<string | undefined>()
const programOpen = ref(false)
const programId = ref<string | undefined>()
const toDelete = ref<Program | null>(null)

function open(p: Program, view: 'calendar' | 'overview' = 'calendar') {
  store.select(p.id)
  ui.selected = null
  router.push({ name: view })
}

function edit(p?: Program) {
  programId.value = p?.id
  programOpen.value = true
}

function openPdfImport(target?: string) {
  pdfTarget.value = target
  pdfOpen.value = true
}

function dateRange(p: Program): string {
  if (!p.days.length) return 'Noch keine Tage'
  const first = p.days[0].date
  const last = p.days[p.days.length - 1].date
  return first === last ? shortDate(first) : `${shortDate(first)} – ${shortDate(last)}${last.slice(0, 4)}`
}

function viewDemo() {
  const existing = store.programs.some((p) => p.id === DEMO_ID)
  store.loadDemo()
  ui.setExcluded(DEMO_ID, [...DEMO_EXCLUDED_CATEGORIES])
  ui.selected = null
  ui.date = null
  ui.calendarMode = 'all'
  router.push({ name: 'overview' })
  ui.notify(existing ? 'Demo zurückgesetzt.' : 'Demo geladen. Im Kalender siehst du, wie die Blöcke zugeordnet sind.')
}

function confirmDelete() {
  if (toDelete.value) store.deleteProgram(toDelete.value.id)
  toDelete.value = null
}

function afterCreate() {
  router.push({ name: 'calendar' })
}
</script>

<template>
  <div class="seite">
    <v-card class="mb-4" elevation="0" border>
      <div class="kopfzeile">
        <h1>Programme</h1>
        <v-spacer />
        <v-btn variant="text" prepend-icon="mdi-star-outline" @click="viewDemo">Demo ansehen</v-btn>
        <v-btn variant="text" prepend-icon="mdi-plus" @click="edit()">Leeres Programm</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-file-pdf-box" @click="openPdfImport()">
          Grobprogramm importieren
        </v-btn>
      </div>

      <div v-if="!store.programs.length" class="willkommen">
        <div class="held">
          <AppLogo :size="104" />
          <div>
            <div class="held-titel">PFADIPROFIL<span>checker</span></div>
            <div class="text-body-1 text-medium-emphasis">
              Welche Beziehungen und Methoden fördert euer Programm und was kommt noch zu kurz?
            </div>
          </div>
        </div>
        <div class="schritte">
          <div class="schritt">
            <div class="nummer">1</div>
            <div>
              <div class="font-weight-medium">Grobprogramm importieren oder von Hand erfassen</div>
            </div>
          </div>
          <div class="schritt">
            <div class="nummer">2</div>
            <div>
              <div class="font-weight-medium">Beziehungen und Methoden zuordnen</div>
            </div>
          </div>
          <div class="schritt">
            <div class="nummer">3</div>
            <div>
              <div class="font-weight-medium">Übersicht ansehen und drucken</div>
            </div>
          </div>
        </div>
        <div class="icons">
          <img v-for="b in RELATIONSHIPS" :key="b.id" :src="b.icon" :alt="b.name" :title="b.name" />
          <img v-for="m in METHODS" :key="m.id" :src="m.icon" :alt="m.name" :title="m.name" />
        </div>
        <div class="d-flex ga-3 flex-wrap justify-center mt-2">
          <v-btn color="primary" size="large" variant="flat" prepend-icon="mdi-file-pdf-box" @click="openPdfImport()">
            Grobprogramm importieren
          </v-btn>
          <v-btn size="large" variant="tonal" color="primary" prepend-icon="mdi-calendar-plus" @click="edit()">
            Von Hand erfassen
          </v-btn>
          <v-btn size="large" variant="text" color="primary" prepend-icon="mdi-star-outline" @click="viewDemo">
            Demo ansehen
          </v-btn>
        </div>
      </div>

      <v-container v-else fluid class="pa-4">
        <v-row>
          <v-col v-for="p in store.programs" :key="p.id" cols="12" sm="6" lg="4">
            <v-card
              class="programm-karte h-100 d-flex flex-column"
              :class="{ aktiv: p.id === store.activeId }"
              elevation="0"
              border
              @click="open(p)"
            >
              <v-card-item>
                <v-card-title class="text-wrap">{{ p.name }}</v-card-title>
                <v-card-subtitle>
                  {{ [p.group, p.level].filter(Boolean).join(' · ') || 'Pfadiprogramm' }}
                </v-card-subtitle>
                <template #append>
                  <v-menu>
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" @click.stop />
                    </template>
                    <v-list density="compact">
                      <v-list-item prepend-icon="mdi-pencil-outline" title="Bearbeiten" @click="edit(p)" />
                      <v-list-item prepend-icon="mdi-file-pdf-box" title="PDF erneut importieren" @click="openPdfImport(p.id)" />
                      <v-list-item prepend-icon="mdi-content-copy" title="Duplizieren" @click="store.duplicateProgram(p.id)" />
                      <v-list-item prepend-icon="mdi-delete-outline" title="Löschen" base-color="error" @click="toDelete = p" />
                    </v-list>
                  </v-menu>
                </template>
              </v-card-item>
              <v-card-text class="pt-0 flex-grow-1">
                <div class="d-flex align-center ga-2 text-body-2 mb-1">
                  <v-icon icon="mdi-calendar-range" size="18" /> {{ dateRange(p) }} · {{ p.days.length }} Tage
                </div>
                <div v-if="p.motto" class="d-flex align-center ga-2 text-body-2 mb-1">
                  <v-icon icon="mdi-script-text-outline" size="18" /> {{ p.motto }}
                </div>
                <div class="mt-3">
                  <div class="d-flex justify-space-between text-body-2 mb-1">
                    <span>Zuordnung</span>
                    <span>{{ progress(p, ui.excludedFor(p.id)).assigned }} / {{ progress(p, ui.excludedFor(p.id)).count }} Blöcke</span>
                  </div>
                  <v-progress-linear
                    :model-value="
                      progress(p, ui.excludedFor(p.id)).count
                        ? (progress(p, ui.excludedFor(p.id)).assigned / progress(p, ui.excludedFor(p.id)).count) * 100
                        : 0
                    "
                    color="primary"
                    bg-color="#E9E1E7"
                    height="8"
                    rounded
                  />
                </div>
              </v-card-text>
              <v-card-actions class="px-4 pb-3">
                <v-btn variant="tonal" color="primary" prepend-icon="mdi-view-dashboard-outline" @click.stop="open(p)">
                  Kalender
                </v-btn>
                <v-btn variant="text" color="primary" prepend-icon="mdi-chart-box-outline" @click.stop="open(p, 'overview')">
                  Übersicht
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-card>

    <PdfImportDialog v-model="pdfOpen" :target-program="pdfTarget" />
    <ProgramDialog v-model="programOpen" :program-id="programId" @created="afterCreate" />

    <v-dialog :model-value="!!toDelete" max-width="440" @update:model-value="toDelete = null">
      <v-card v-if="toDelete">
        <v-card-title class="pt-4">Programm löschen?</v-card-title>
        <v-card-text>
          «{{ toDelete.name }}» mit {{ toDelete.blocks.length }} Blöcken wird gelöscht. Tipp: Exportiere vorher den Stand
          als JSON.
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="toDelete = null">Abbrechen</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.willkommen {
  padding: 32px 24px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}
.held {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
  text-align: left;
}
.held-titel {
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1.05;
  color: var(--brombeer-dunkel);
  letter-spacing: 0.01em;
}
.held-titel span {
  font-weight: 500;
  color: var(--brombeer);
  margin-left: 6px;
  font-size: 0.85em;
}
@media (max-width: 600px) {
  .held-titel {
    font-size: 1.8rem;
  }
}
.schritte {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 900px;
}
.schritt {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  border-radius: 12px;
  background: #faf6f9;
}
.nummer {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brombeer);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}
.icons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  max-width: 900px;
}
.icons img {
  width: 52px;
  height: 52px;
  object-fit: contain;
}
.programm-karte {
  transition: border-color 0.15s, box-shadow 0.15s;
}
.programm-karte:hover {
  border-color: var(--brombeer) !important;
}
.programm-karte.aktiv {
  border-color: var(--brombeer) !important;
  box-shadow: 0 0 0 1px var(--brombeer);
}
</style>
