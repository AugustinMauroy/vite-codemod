import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: [
      {
        customResolver() {
          return null
        },
        find: 'react',
        replacement: 'preact/compat',
      },
    ],
  },
})
