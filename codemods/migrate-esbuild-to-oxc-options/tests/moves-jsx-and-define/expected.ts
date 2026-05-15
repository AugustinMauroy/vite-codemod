import { defineConfig } from "vite";

export default defineConfig({
	oxc: {
		define: {
			__DEV__: "true",
		},
		exclude: /node_modules/,
		include: /\.[jt]sx?$/,
		jsx: {
			importSource: "react",
			runtime: "automatic",
		},
		jsxInject: "import React from 'react'",
	},
});
