export default {
	build: {
		minify: "esbuild",
	},
	esbuild: {
		define: {
			__DEV__: "true",
		},
		include: /\.[jt]sx?$/,
	},
};
