import { defineConfig as dc } from "vite";

export default dc(
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


                    },});
