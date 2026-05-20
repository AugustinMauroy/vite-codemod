import { defineConfig as dc } from "vite";

export default dc({
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
