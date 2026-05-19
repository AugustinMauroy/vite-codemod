import { defineConfig as dc } from "vite";

export default dc({
	build: {
		lib: {
			entry: "src/main.ts",
			formats: ["umd"],
		},
	},
});
