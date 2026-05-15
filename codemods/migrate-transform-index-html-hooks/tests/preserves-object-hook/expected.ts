import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		{
			name: "html-hooks",
			transformIndexHtml: {
				order: "post",
				handler(html) {
					return html;
				},
			},
		},
	],
});
