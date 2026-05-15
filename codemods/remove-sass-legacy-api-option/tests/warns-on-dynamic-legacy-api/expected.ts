// Expected warning:
// Warning: Unable to safely migrate dynamic Sass legacy API usage.
import { defineConfig } from "vite";

const legacyApi = "legacy";

export default defineConfig({
	css: {
		preprocessorOptions: {
			sass: {
				api: legacyApi,
			},
		},
	},
});
