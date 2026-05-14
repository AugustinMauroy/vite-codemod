// Expected warning:
// Warning: import.meta.url polyfills are only applicable to UMD/IIFE output.
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['es'],
    },
  },
})
