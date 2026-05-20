// Expected warning:
// Warning: Condition-order assumptions must be reviewed manually.
import { defineConfig as dc } from "vite";

const clientConditions = ["browser", "development"];

export default dc({
	resolve: {
		conditions: clientConditions,
	},
});
