import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Dialog, Notify } from 'quasar'
import router from './router'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Quasar, {
    plugins: {
        Dialog,
        Notify
    }
})

app.mount('#app')
