// Expected warning:
// Warning: Unable to safely normalize conditional CSS minifier selection.
import { defineConfig } from "vite";

const useLegacyMinifier = true;

export default defineConfig({
	build: {
		cssMinify: useLegacyMinifier ? "esbuild" : "lightningcss",
	},
});
