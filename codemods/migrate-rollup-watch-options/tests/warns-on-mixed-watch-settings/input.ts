import { defineConfig } from 'vite'

const watcher = {
  usePolling: true,
}

export default defineConfig({
  build: {
    rollupOptions: {
      watch: {
        chokidar: watcher,
        clearScreen: false,
      },
    },
  },
})
