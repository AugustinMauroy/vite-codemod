import { defineConfig as dc } from "vite";

export default dc({
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
