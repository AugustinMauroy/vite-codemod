import { defineConfig as dc } from "vite";

export default dc({
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
