// Expected warning:
// Warning: Unable to safely migrate computed transformIndexHtml hook metadata.
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
