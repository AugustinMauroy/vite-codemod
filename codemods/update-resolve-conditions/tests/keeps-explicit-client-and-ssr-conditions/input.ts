import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    conditions: ['browser', 'development'],
  },
  ssr: {
    resolve: {
      conditions: ['node', 'development'],
    },
  },
})
