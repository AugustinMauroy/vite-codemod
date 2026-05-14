// Expected warning:
// Warning: resolve.alias customResolver must be rewritten as a plugin.
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
