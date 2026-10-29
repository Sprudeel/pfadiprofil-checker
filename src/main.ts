import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/inter'
import vuetify from './plugins/vuetify'
import router from './router'
import './styles/app.css'
import App from './App.vue'

// 404.html merkt sich den angefragten Pfad, falls GitHub Pages ihn nicht direkt ausliefern konnte.
// Muss vor router-Installation laufen, da der Router beim Installieren sofort die aktuelle URL auflöst.
const redirect = sessionStorage.getItem('spa-redirect')
if (redirect) {
  sessionStorage.removeItem('spa-redirect')
  history.replaceState(null, '', redirect)
}

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
