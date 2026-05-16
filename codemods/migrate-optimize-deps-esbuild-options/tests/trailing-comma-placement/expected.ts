import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    rolldownOptions: {
      output: {
        keepNames: true,
      },
      platform: "browser",
      transform: {
        define: {
          __DEV__: "true",
        },
      },
    },
  },
});
