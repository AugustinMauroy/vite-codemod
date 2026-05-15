import { defineConfig } from "vite";

export default defineConfig({
	esbuild: {
		drop: ["console"],
	},
});
