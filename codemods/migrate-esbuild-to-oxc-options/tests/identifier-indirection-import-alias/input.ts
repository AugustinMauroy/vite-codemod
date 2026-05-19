import { defineConfig as dc } from "vite";

export default dc({
	esbuild: {
		define: {
			__DEV__: "true",
		},
		jsx: "automatic",
		jsxImportSource: "react",
	},
});
