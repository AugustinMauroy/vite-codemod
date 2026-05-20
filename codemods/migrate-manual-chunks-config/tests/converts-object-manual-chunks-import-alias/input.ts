import { defineConfig as dc } from "vite";

export default dc({
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
