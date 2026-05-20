import { defineConfig as dc } from "vite";

const clientConditions = ["browser", "development"];

export default dc({
	resolve: {
		conditions: clientConditions,
	},
});
