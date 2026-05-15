import { defineConfig } from "vite";

const viteConfig = defineConfig({
	oxc: {
		define: {
			__DEV__: "true",
		},
		jsx: {
			importSource: "react",
			runtime: "automatic",
		},
	},
});

export default viteConfig;
