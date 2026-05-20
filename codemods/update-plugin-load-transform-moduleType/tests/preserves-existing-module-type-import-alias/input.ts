import { defineConfig as dc } from "vite";

export default dc({
	plugins: [
		{
			name: "txt-loader",
			load(id: string) {
				if (id.endsWith(".txt")) {
					return {
						code: `export default \"x\"`,
						moduleType: "js",
					};
				}
			},
		},
	],
});
