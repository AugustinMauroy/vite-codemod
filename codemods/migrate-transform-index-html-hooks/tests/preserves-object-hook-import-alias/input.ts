import { defineConfig as dc } from "vite";

export default dc({
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
