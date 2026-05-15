import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		{
			name: "html-hooks",
			transformIndexHtml: {
				order: "pre",
				handler(html) {
					return html.replace("<title>Vite</title>", "<title>App</title>");
				},
			},
		},
	],
});
