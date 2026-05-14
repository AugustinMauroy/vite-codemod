import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: {
            charting: ['d3'],
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  },
})
