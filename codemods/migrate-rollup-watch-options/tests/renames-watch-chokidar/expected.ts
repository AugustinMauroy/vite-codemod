import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rolldownOptions: {
      watch: {
        watcher: {
          interval: 100,
          usePolling: true,
        },
      },
    },
  },
})
