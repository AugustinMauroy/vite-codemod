import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: "src/main.ts",
			formats: ["iife"],
		},
	},
	define: {
		"import.meta.url": "__vite_import_meta_url__",
	},
});
