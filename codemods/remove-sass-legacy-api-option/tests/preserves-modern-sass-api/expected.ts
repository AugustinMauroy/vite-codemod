import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    preprocessorOptions: {
      sass: {
        quietDeps: true,
      },
      scss: {
        additionalData: '$brand-color: rebeccapurple;'
      },
    },
  },
})
