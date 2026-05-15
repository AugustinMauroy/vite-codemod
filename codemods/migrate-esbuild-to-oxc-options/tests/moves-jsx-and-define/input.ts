import { defineConfig } from "vite";

export default defineConfig({
	esbuild: {
		define: {
			__DEV__: "true",
		},
		exclude: /node_modules/,
		include: /\.[jt]sx?$/,
		jsx: "automatic",
		jsxInject: "import React from 'react'",
		jsxImportSource: "react",
	},
});
