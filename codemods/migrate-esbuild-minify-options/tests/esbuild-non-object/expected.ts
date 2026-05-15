import { defineConfig } from "vite";

function getEsbuild() {
	return { minifyWhitespace: true };
}

export default defineConfig({
	esbuild: getEsbuild(),
});
