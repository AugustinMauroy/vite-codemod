import { defineConfig as dc } from "vite";

export default dc({
	build: {
		rolldownOptions: {
			watch: {
				watcher: {
					interval: 100,
					usePolling: true,
				},
			},
		},
	},
});
