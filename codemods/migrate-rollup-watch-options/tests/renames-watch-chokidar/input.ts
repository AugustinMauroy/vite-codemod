import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rollupOptions: {
			watch: {
				chokidar: {
					interval: 100,
					usePolling: true,
				},
			},
		},
	},
});
