import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
          identifiers: true,
          syntax: true,
          whitespace: true,
        },
      },
    },
  },
});
