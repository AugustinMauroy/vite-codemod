import { defineConfig } from "vite";

export default defineConfig(
        rolldownOptions: {


            output: {
                keepNames: true,
            }


            platform: "browser",
            resolve: {


                mainFields: ["browser", "module"],
            }
            // original rolldownOptions moved here for migration


            transform: {
                define: {
                    __DEV__: "true",
                }
            }
        }
 {
        optimizeDeps: {


                    },
});
