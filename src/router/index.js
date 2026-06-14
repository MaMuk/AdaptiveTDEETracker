import { createRouter, createWebHistory } from 'vue-router'
import { readAppSettingsSnapshot, resolveSetupCompleted } from '../utils/setupCompletion'

const APP_SETTINGS_STORAGE_KEY = 'tdee_app_settings_store'

function isSetupCompleted() {
    const snapshot = readAppSettingsSnapshot()
    return resolveSetupCompleted(snapshot)
}

function isDisclaimerAccepted() {
    try {
        const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
        if (!raw) return false
        const parsed = JSON.parse(raw)
        return Boolean(parsed?.disclaimerAccepted)
    } catch {
        return false
    }
}

const routes = [
    {
        path: '/onboarding',
        name: 'Onboarding',
        component: () => import('../views/OnboardingView.vue')
    },
    {
        path: '/welcome',
        name: 'Welcome',
        component: () => import('../views/WelcomeView.vue')
    },
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
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

router.beforeEach((to) => {
    const completed = isSetupCompleted()
    const disclaimerAccepted = isDisclaimerAccepted()
    if (!completed && to.name !== 'Onboarding' && to.name !== 'DataTransfer') {
        return { name: 'Onboarding' }
    }
    if (completed && to.name === 'Onboarding') {
        return { name: 'Tracker' }
    }
    if (completed && !disclaimerAccepted && to.name !== 'Welcome' && to.name !== 'DataTransfer' && to.name !== 'Onboarding') {
        return { name: 'Welcome' }
    }
    if (completed && disclaimerAccepted && to.name === 'Welcome') {
        return { name: 'Tracker' }
    }
    return true
})

export default router
