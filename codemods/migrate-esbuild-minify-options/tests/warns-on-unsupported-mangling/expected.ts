// Expected warning:
// Warning: Property mangling cannot be migrated to Rolldown minify options.
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    mangleProps: /^_/,
    minifySyntax: true,
  },
})
