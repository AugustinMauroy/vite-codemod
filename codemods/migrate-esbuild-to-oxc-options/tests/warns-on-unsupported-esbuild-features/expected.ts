import { defineConfig } from "vite";

export default defineConfig({
	// TODO(vite): Review this esbuild option. JavaScript transforms are now handled by OXC.
	esbuild: {
		banner: "/* top */",
		footer: "/* bottom */",
		supported: {
			bigint: true,
		},
		tsconfigRaw: {
			compilerOptions: {
				jsx: "react-jsx",
			},
		},
	},
	oxc: {
		define: {
			__DEV__: "true",
		},
		include: /\.[jt]sx?$/,
		jsx: {
			development: true,
		},
	},
});
