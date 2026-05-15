import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'src/main.ts',
			formats: ['iife'],
		},
		rolldownOptions: {
			output: {
				intro: 'var __vite_import_meta_url__ = document.currentScript && document.currentScript.src',
			},
		},
	},
	define: {
		'import.meta.url': '__vite_import_meta_url__',
	},
})
