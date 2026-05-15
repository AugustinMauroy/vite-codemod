import { defineConfig } from "vite";

export default defineConfig({
	esbuild: {
		banner: "/* top */",
		define: {
			__DEV__: "true",
		},
		footer: "/* bottom */",
		include: /\.[jt]sx?$/,
		supported: {
			bigint: true,
		},
		tsconfigRaw: {
			compilerOptions: {
				jsx: "react-jsx",
			},
		},
		jsxDev: true,
	},
});
