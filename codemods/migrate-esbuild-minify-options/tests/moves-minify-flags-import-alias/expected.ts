import { defineConfig as dc } from "vite";

export default dc({
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
