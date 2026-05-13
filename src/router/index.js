import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'Tracker',
        component: () => import('../views/TrackerView.vue')
    },
    {
        path: '/settings',
        name: 'Settings',
        component: () => import('../views/SettingsView.vue')
    },
    {
        path: '/statistics',
        name: 'Statistics',
        component: () => import('../views/StatisticsView.vue')
    },
    {
        path: '/diary',
        name: 'Diary',
        component: () => import('../views/DiaryView.vue')
    },
    {
        path: '/suggestions',
        name: 'Suggestions',
        component: () => import('../views/SuggestionsView.vue')
    },
    {
        path: '/diary/ai-recognition',
        name: 'DiaryAiRecognition',
        component: () => import('../views/DiaryAiRecognitionView.vue')
    },
    {
        path: '/suggestions/ai-recognition',
        name: 'SuggestionAiRecognition',
        component: () => import('../views/SuggestionAiRecognitionView.vue')
    },
    {
        path: '/settings/data-transfer',
        name: 'DataTransfer',
        component: () => import('../views/DataTransferView.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
