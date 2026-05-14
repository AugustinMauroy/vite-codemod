import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      conditions: ['browser'],
      define: {
        __DEV__: 'true',
      },
      keepNames: true,
      mainFields: ['browser', 'module'],
      platform: 'browser',
      preserveSymlinks: true,
      resolveExtensions: ['.js', '.ts'],
    },
  },
})
