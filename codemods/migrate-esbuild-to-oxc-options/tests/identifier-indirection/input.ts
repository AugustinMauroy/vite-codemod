import { defineConfig } from "vite";

const viteConfig = defineConfig({
	esbuild: {
		define: {
			__DEV__: "true",
		},
		jsx: "automatic",
		jsxImportSource: "react",
	},
});

export default viteConfig;
