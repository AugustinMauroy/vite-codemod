import { defineConfig as dc } from "vite";

const legacyApi = "legacy";

export default dc({
	css: {
		preprocessorOptions: {
			sass: {
				api: legacyApi,
			},
		},
	},
});
