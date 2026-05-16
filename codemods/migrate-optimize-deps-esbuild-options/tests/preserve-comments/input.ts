import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    // Keep important comments
    esbuildOptions: {
      // feature flags
      define: { __DEV__: "true" }, // inline comment
      keepNames: true,
    },
  },
});
