import { defineConfig } from "vite";

const useLegacyMinifier = true;

export default defineConfig({
	build: {
		cssMinify: useLegacyMinifier ? "esbuild" : "lightningcss",
	},
});
