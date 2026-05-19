import { defineConfig as dc } from "vite";

export default dc({
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
