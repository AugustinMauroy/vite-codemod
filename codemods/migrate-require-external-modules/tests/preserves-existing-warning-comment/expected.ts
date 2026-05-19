// Expected warning:
// Warning: Dynamic external module lists cannot be normalized automatically.
import { defineConfig, esmExternalRequirePlugin } from "vite";

const externalModules = ["react"];

export default defineConfig({
	plugins: [
		esmExternalRequirePlugin({
			external: externalModules,
		}),
	],
});
