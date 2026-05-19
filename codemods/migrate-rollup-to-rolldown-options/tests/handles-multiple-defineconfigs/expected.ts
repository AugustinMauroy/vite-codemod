import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        format: "es",
      },
    },
  },
});

export const other = defineConfig({
  build: {
    rolldownOptions: {
      output: {
        format: "cjs",
      },
    },
  },
});
