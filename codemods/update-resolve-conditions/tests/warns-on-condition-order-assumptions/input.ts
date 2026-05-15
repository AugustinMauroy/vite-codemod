import { defineConfig } from "vite";

const clientConditions = ["browser", "development"];

export default defineConfig({
	resolve: {
		conditions: clientConditions,
	},
});
