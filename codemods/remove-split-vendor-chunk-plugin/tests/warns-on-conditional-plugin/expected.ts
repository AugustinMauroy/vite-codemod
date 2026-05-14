// Expected warning:
// Warning: Unable to safely remove splitVendorChunkPlugin from conditional plugin logic.
import { defineConfig, splitVendorChunkPlugin } from 'vite'

const shouldSplit = true

export default defineConfig({
  plugins: [shouldSplit ? splitVendorChunkPlugin() : undefined].filter(Boolean),
})
