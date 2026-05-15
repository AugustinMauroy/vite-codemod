import { defineConfig } from "vite";

const hook = {
	enforce: "pre" as const,
	transform(html: string) {
		return html;
	},
};

export default defineConfig({
	plugins: [
		{
			name: "html-hooks",
			transformIndexHtml: hook,
		},
	],
});
