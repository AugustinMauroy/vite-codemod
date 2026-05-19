import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {

  // Keep important comments

  rolldownOptions: {


    output: {
      keepNames: true,
    }
    // feature flags


    transform: {
      define: { __DEV__: "true" }, // inline comment,
    }
  }
},
});
