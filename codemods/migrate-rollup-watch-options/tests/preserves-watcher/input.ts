import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rolldownOptions: {
			watch: {
				watcher: {
					usePolling: false,
				},
			},
		},
	},
});
