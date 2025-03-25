import { defineConfig } from 'vite'
import VitePluginSmartRestart from 'vite-plugin-smart-restart'

export default defineConfig({
  plugins: [
    VitePluginSmartRestart({
      restart: [
        { file: 'trigger.txt', checkContent: true },
        '../../dist/*.*',
      ],
    }),
  ],
})
