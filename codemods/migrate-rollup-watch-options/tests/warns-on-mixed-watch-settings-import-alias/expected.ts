// Expected warning:
// Warning: Mixed watch settings require manual migration review.
import { defineConfig as dc } from "vite";

const watcher = {
	usePolling: true,
};

export default dc({
	build: {
		rollupOptions: {
			watch: {
				chokidar: watcher,
				clearScreen: false,
			},
		},
	},
});
