// Expected warning:
// Warning: esbuild banner/footer and supported flags require manual migration.
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
