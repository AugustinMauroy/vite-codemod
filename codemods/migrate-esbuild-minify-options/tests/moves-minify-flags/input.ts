import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    drop: ['console', 'debugger'],
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
})
