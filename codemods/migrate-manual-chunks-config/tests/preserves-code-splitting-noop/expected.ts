import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: {
						vendor: ["react", "react-dom"],
					},
				},
			},
		},
	},
});
