// Expected warning:
// Warning: Function-form manualChunks with side effects needs manual review.
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("virtual:")) {
						console.log("chunking", id);
					}

					return id.includes("node_modules") ? "vendor" : undefined;
				},
			},
		},
	},
});
