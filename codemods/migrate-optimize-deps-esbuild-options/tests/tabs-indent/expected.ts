import { defineConfig } from "vite";

export default defineConfig(
		rolldownOptions: {


			output: {
				keepNames: true,
			}


			platform: "browser",
			resolve: {


				conditionNames: ["browser"],
			}
		}
{
			 optimizeDeps: {


							 },
});
