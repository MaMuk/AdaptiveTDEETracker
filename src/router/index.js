import { createRouter, createWebHistory } from 'vue-router'
import TrackerView from '../views/TrackerView.vue'
import SettingsView from '../views/SettingsView.vue'
import StatisticsView from '../views/StatisticsView.vue'

const routes = [
    {
        path: '/',
        name: 'Tracker',
        component: TrackerView
    },
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsView
    },
    {
        path: '/statistics',
        name: 'Statistics',
        component: StatisticsView
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
