import { defineConfig } from "vite";

export default defineConfig({
	build: {
		minify: "esbuild",
	},
	esbuild: {
		define: {
			__DEV__: "false",
		},
		minify: true,
	},
});
