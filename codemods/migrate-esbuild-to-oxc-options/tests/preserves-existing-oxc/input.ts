import { defineConfig } from "vite";

export default defineConfig({
	oxc: {
		define: {
			__DEV__: "false",
		},
		jsx: {
			development: true,
			pragma: "h",
			pragmaFrag: "Fragment",
			runtime: "classic",
		},
	},
});
