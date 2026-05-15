import { defineConfig, esmExternalRequirePlugin } from "vite";

export default defineConfig({
	plugins: [
		esmExternalRequirePlugin({
			external: ["react"],
		}),
	],
});
