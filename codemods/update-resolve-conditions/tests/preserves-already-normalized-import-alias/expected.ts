import { defineConfig as dc } from "vite";

export default dc({
	resolve: {
		conditions: ["development"],
	},
	ssr: {
		resolve: {
			conditions: ["development"],
		},
	},
});
