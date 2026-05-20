import { defineConfig as dc } from "vite";

export default dc({
	build: {
		rolldownOptions: {
		output: {
				codeSplitting: {
						groups: {
								charting: ["d3"],
								vendor: ["react", "react-dom"],
						}
				}
		}
	},
});
