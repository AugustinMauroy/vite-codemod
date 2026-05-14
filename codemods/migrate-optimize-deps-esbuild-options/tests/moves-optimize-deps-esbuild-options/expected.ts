import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    rolldownOptions: {
      output: {
        keepNames: true,
      },
      platform: 'browser',
      resolve: {
        conditionNames: ['browser'],
        extensions: ['.js', '.ts'],
        mainFields: ['browser', 'module'],
        symlinks: false,
      },
      transform: {
        define: {
          __DEV__: 'true',
        },
      },
    },
  },
})
