import { defineConfig as dc } from "vite";

export default dc({
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
