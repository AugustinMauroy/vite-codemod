import { defineConfig } from "vite";

export default defineConfig({
	build: {
		cssMinify: "esbuild",
		other: true,
	},
});
