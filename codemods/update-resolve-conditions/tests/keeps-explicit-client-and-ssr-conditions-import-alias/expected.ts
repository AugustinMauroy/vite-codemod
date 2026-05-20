import { defineConfig as dc } from "vite";

export default dc({
	resolve: {
		conditions: ["browser", "development"],
	},
	ssr: {
		resolve: {
			conditions: ["node", "development"],
		},
	},
});
