import { defineConfig } from "vite";

export default defineConfig({
	optimizeDeps: {
		rolldownOptions: {
			output: {
				keepNames: false,
			},
			resolve: {
				conditionNames: ["module"],
			},
		},
	},
});
