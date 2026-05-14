import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    conditions: ['development'],
  },
  ssr: {
    resolve: {
      conditions: ['development'],
    },
  },
})
