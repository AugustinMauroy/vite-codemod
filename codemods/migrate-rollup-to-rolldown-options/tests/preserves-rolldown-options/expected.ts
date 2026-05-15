import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rolldownOptions: {
			output: {
				format: "es",
			},
		},
	},
});
