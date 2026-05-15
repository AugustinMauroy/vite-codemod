import { defineConfig } from "vite";

export default defineConfig({
	css: {
		preprocessorOptions: {
			sass: {
				api: "legacy",
			},
			scss: {
				api: "legacy",
			},
		},
	},
});
