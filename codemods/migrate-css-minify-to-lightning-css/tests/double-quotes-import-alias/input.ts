import { defineConfig as dc } from "vite";

export default dc({
	build: {
		cssMinify: "esbuild",
	},
});
