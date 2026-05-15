import { defineConfig } from "vite";

export default defineConfig({
	esbuild: {
		banner: "/* top */",
		footer: "/* bottom */",
		supported: {
			bigint: true,
		},
	},
});
