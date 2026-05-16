import { defineConfig } from "vite";

export default defineConfig({
	optimizeDeps: {
		esbuildOptions: {
			conditions: ["browser"],
			keepNames: true,
			platform: "browser",
		},
	},
});
