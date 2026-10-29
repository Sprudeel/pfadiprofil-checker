import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/inter'
import vuetify from './plugins/vuetify'
import router from './router'
import './styles/app.css'
import App from './App.vue'

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
