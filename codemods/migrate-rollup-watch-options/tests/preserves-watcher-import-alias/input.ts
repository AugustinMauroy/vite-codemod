import { defineConfig as dc } from "vite";

export default dc({
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
