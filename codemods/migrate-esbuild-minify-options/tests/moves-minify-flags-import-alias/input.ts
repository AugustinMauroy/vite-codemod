import { defineConfig as dc } from "vite";

export default dc({
	esbuild: {
		drop: ["console", "debugger"],
		minifyIdentifiers: true,
		minifySyntax: true,
		minifyWhitespace: true,
	},
});
