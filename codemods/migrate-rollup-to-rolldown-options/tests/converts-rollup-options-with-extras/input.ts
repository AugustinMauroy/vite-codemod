import { defineConfig } from "vite";

export default defineConfig({
  build: {
    commonjsOptions: {
      include: [/src/],
    },
    rollupOptions: {
      output: {
        format: "cjs",
      },
      plugins: [],
    },
  },
});
