import { defineConfig, esmExternalRequirePlugin } from 'vite'

const externalModules = ['react']

export default defineConfig({
  plugins: [
    esmExternalRequirePlugin({
      external: externalModules,
    }),
  ],
})
