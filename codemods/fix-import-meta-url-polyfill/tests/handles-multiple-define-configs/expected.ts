import { defineConfig } from "vite";

export const client = defineConfig({
	build: {
		lib: {
			entry: "src/main.ts",
			formats: ["umd"],
		}
		rolldownOptions: {
			output: {
				intro: 'var __vite_import_meta_url__ = document.currentScript && document.currentScript.src',
			}
		}
	}
	define: {
		'import.meta.url': '__vite_import_meta_url__',
	}
});

export const server = defineConfig({
	build: {
		lib: {
			entry: "src/server.ts",
			formats: ["es"],
		},
	},
});
