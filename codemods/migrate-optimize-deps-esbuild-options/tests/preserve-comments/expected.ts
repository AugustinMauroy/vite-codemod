import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    // Keep important comments
    rolldownOptions: {
      // feature flags
      transform: {
        define: { __DEV__: "true" }, // inline comment
      },
      output: {
        keepNames: true,
      },
    },
  },
});
