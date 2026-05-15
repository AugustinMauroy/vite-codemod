import { defineConfig } from "vite";

export default defineConfig({
	build: {
		minify: "esbuild",
	},
	esbuild: {
		minify: true,
	},
	oxc: {
		define: {
			__DEV__: "false",
		},
	},
});
