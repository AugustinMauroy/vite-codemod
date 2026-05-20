import { defineConfig as dc } from "vite";

const hook = {
	enforce: "pre" as const,
	transform(html: string) {
		return html;
	},
};

export default dc({
	plugins: [
		{
			name: "html-hooks",
			transformIndexHtml: hook,
		},
	],
});
