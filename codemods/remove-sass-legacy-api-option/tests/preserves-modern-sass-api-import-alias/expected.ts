import { defineConfig as dc } from "vite";

export default dc({
	css: {
		preprocessorOptions: {
			sass: {
				quietDeps: true,
			},
			scss: {
				additionalData: "$brand-color: rebeccapurple;",
			},
		},
	},
});
