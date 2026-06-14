import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { fileURLToPath } from 'node:url'

const basePath = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base: basePath,
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar({
      autoImportComponentCase: 'kebab',
      sassVariables: fileURLToPath(new URL('./src/quasar-variables.sass', import.meta.url))
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('/chart.js/') || id.includes('/vue-chartjs/')) {
            return 'vendor-charting'
          }

          if (id.includes('/quasar/') || id.includes('/@quasar/')) {
            return 'vendor-quasar'
          }

          if (id.includes('/@capacitor/')) {
            return 'vendor-capacitor'
          }

          return 'vendor'
        }
      }
    }
  }
})
