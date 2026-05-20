import { defineConfig as dc } from "vite";

export default dc({
	plugins: [
		{
			name: "txt-loader",
			load(id: string) {
				if (id.endsWith(".txt")) {
					const content = "example";

					return {
						code: `export default ${JSON.stringify(content)}`,
					};
				}
			},
		},
	],
});
