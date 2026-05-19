import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        format: "es",
      },
    },
  },
});

export const other = defineConfig({
  build: {
    rollupOptions: {
      output: {
        format: "cjs",
      },
    },
  },
});
