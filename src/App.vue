<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProgramStore } from '@/stores/program'
import { useUiStore } from '@/stores/ui'
import StateImportDialog from '@/components/StateImportDialog.vue'
import AppLogo from '@/components/AppLogo.vue'
import { filename, download } from '@/utils/file'

const store = useProgramStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const navigation: { name: 'programs' | 'calendar' | 'overview'; title: string; icon: string }[] = [
  { name: 'programs', title: 'Programme', icon: 'mdi-folder-multiple-outline' },
  { name: 'calendar', title: 'Kalender', icon: 'mdi-view-dashboard-outline' },
  { name: 'overview', title: 'Übersicht', icon: 'mdi-chart-box-outline' },
]

const importOpen = ref(false)
const snackbar = computed({
  get: () => !!ui.message,
  set: (v) => {
    if (!v) ui.message = null
  },
})

function exportData() {
  download(filename('pfadiprofil-checker', 'json'), JSON.stringify(store.exportState(), null, 2))
  ui.notify('Der ganze Stand wurde als JSON-Datei heruntergeladen.')
}
</script>

<template>
  <v-app>
    <v-app-bar color="appbar" density="comfortable" flat class="no-print">
      <div class="d-flex align-center ga-2 px-4 marke" role="button" @click="router.push({ name: 'programs' })">
        <AppLogo :size="34" background="#84456E" />
        <span class="wortmarke d-none d-sm-inline">PFADIPROFIL<span class="checker">checker</span></span>
      </div>

      <div v-if="store.active" class="d-none d-md-flex align-center ga-1 ml-2 text-body-1 programm-name">
        <v-icon icon="mdi-tent" size="20" />
        <span class="text-truncate">{{ store.active.name }}</span>
      </div>

      <div class="d-flex ml-4">
        <v-btn
          v-for="n in navigation"
          :key="n.name"
          :to="{ name: n.name }"
          :prepend-icon="n.icon"
          :variant="route.name === n.name ? 'tonal' : 'text'"
          :disabled="n.name !== 'programs' && !store.active"
          class="nav-btn"
        >
          <span class="d-none d-sm-inline">{{ n.title }}</span>
        </v-btn>
      </div>

      <v-spacer />

      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" prepend-icon="mdi-content-save-outline" variant="text" class="mr-2">
            <span class="d-none d-sm-inline">Daten</span>
          </v-btn>
        </template>
        <v-list density="compact" min-width="260">
          <v-list-item prepend-icon="mdi-download" title="Stand exportieren" subtitle="Alles als JSON-Datei" @click="exportData" />
          <v-list-item prepend-icon="mdi-upload" title="Stand importieren" subtitle="JSON-Datei laden" @click="importOpen = true" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <StateImportDialog v-model="importOpen" />

    <v-snackbar v-model="snackbar" :color="ui.message?.color" timeout="3500" location="bottom">
      {{ ui.message?.text }}
    </v-snackbar>
    <v-snackbar :model-value="store.storageError" color="error" timeout="-1" location="top">
      Der Browser-Speicher ist voll oder gesperrt. Bitte den Stand als JSON exportieren, damit nichts verloren geht.
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.marke {
  cursor: pointer;
  color: #fff;
}
.wortmarke {
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.02em;
  line-height: 1;
}
.checker {
  font-weight: 500;
  letter-spacing: 0.01em;
  color: #a1d9d4;
  margin-left: 3px;
  text-transform: lowercase;
}
.programm-name {
  color: rgba(255, 255, 255, 0.85);
  max-width: 280px;
}
.nav-btn {
  color: #fff !important;
}
</style>
