import { defineConfig as dc, esmExternalRequirePlugin } from "vite";

export default dc({
    plugins: [
      esmExternalRequirePlugin({
        external: ["react", "vue", /^node:/],
      }),
    ],
});
