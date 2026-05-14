import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    mangleProps: /^_/,
    minifySyntax: true,
  },
})
