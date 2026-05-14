import { defineConfig } from 'vite'

const legacyApi = 'legacy'

export default defineConfig({
  css: {
    preprocessorOptions: {
      sass: {
        api: legacyApi,
      },
    },
  },
})
