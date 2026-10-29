import { createRouter, createWebHashHistory } from 'vue-router'
import { useProgramStore } from '@/stores/program'
import ProgramsView from '@/views/ProgramsView.vue'
import CalendarView from '@/views/CalendarView.vue'
import OverviewView from '@/views/OverviewView.vue'

const router = createRouter({
  // Hash-Routing (#/calendar): funktioniert auf GitHub Pages ohne Server-Rewrites und ohne festen Pfad
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'programs', component: ProgramsView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
    { path: '/overview', name: 'overview', component: OverviewView },
  ],
})

router.beforeEach((to) => {
  const store = useProgramStore()
  if (to.name !== 'programs' && !store.active) return { name: 'programs' }
})

export default router
