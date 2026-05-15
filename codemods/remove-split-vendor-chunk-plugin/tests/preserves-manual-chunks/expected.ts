import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					return id.includes("node_modules") ? "vendor" : undefined;
				},
			},
		},
	},
});
