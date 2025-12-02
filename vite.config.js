import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar({
      autoImportComponentCase: 'kebab',
      sassVariables: fileURLToPath(new URL('./src/quasar-variables.sass', import.meta.url))
    })
  ],
})
