import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        minify: {
          whitespace: true,
        },
      },
    },
  },

  esbuild: {
    target: "esnext",
  },
});
