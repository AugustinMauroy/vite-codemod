import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      conditions: ["browser"],
      define: {
        __DEV__: "true"
      },
      keepNames: true,
      platform: "browser",
    },
  },
});
