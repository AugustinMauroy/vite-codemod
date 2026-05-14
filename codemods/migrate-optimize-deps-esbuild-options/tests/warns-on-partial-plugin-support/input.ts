import { defineConfig } from 'vite'

const plugin = {
  name: 'dep-plugin',
  setup() {},
}

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      plugins: [plugin],
    },
  },
})
