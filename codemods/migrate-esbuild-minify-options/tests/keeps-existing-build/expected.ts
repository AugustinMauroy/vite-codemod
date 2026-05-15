import { defineConfig } from "vite";

export default defineConfig({
	build: {
		assetsInlineLimit: 0,
		rolldownOptions: {
			output: {
				minify: {
					identifiers: true,
					syntax: true,
				},
			},
		},
	},
});
