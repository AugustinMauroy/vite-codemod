import { defineConfig } from "vite";

export default defineConfig({
	build: {
		commonjsOptions: {
			include: [/src/],
		},
		dynamicImportVarsOptions: {
			warnOnError: true,
		},
		rollupOptions: {
			output: {
				format: "es",
			},
		},
	},
	worker: {
		rollupOptions: {
			output: {
				format: "es",
			},
		},
	},
});
