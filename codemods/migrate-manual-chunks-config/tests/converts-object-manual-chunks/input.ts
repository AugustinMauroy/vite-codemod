import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom"],
					charting: ["d3"],
				},
			},
		},
	},
});
