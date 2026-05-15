export default {
	build: {
		minify: "esbuild",
	},
	oxc: {
		define: {
			__DEV__: "true",
		},
		include: /\.[jt]sx?$/,
	},
};
