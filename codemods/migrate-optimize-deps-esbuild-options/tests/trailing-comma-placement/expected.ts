import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
  rolldownOptions: {


    output: {
      keepNames: true,
    }


    platform: "browser",
    resolve: {


      conditionNames: ["browser"],
    }


    transform: {
      define: {
        __DEV__: "true"
      }
    }
  }
},
});
