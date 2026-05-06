import { createRouter, createWebHistory } from 'vue-router'
import TrackerView from '../views/TrackerView.vue'
import SettingsView from '../views/SettingsView.vue'
import StatisticsView from '../views/StatisticsView.vue'
import DiaryView from '../views/DiaryView.vue'
import SuggestionsView from '../views/SuggestionsView.vue'
import DiaryAiRecognitionView from '../views/DiaryAiRecognitionView.vue'
import SuggestionAiRecognitionView from '../views/SuggestionAiRecognitionView.vue'

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
    },
    {
        path: '/diary',
        name: 'Diary',
        component: DiaryView
    },
    {
        path: '/suggestions',
        name: 'Suggestions',
        component: SuggestionsView
    },
    {
        path: '/diary/ai-recognition',
        name: 'DiaryAiRecognition',
        component: DiaryAiRecognitionView
    },
    {
        path: '/suggestions/ai-recognition',
        name: 'SuggestionAiRecognition',
        component: SuggestionAiRecognitionView
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
