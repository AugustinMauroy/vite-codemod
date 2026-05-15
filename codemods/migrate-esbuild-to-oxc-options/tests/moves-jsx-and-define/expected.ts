import { defineConfig } from "vite";

export default defineConfig({
	oxc: {
		define: {
			__DEV__: "true",
		},
		include: /\.[jt]sx?$/,
		exclude: /node_modules/,
		jsxInject: "import React from 'react'",
		jsx: {
			importSource: "react",
			runtime: "automatic",
		},
	},
});
