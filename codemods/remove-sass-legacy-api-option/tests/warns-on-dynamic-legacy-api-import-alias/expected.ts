// Expected warning:
// Warning: Unable to safely migrate dynamic Sass legacy API usage.
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
