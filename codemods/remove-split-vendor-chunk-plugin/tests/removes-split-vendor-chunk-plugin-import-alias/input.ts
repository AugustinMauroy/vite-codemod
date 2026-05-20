import { defineConfig as dc, splitVendorChunkPlugin as svc } from "vite";

export default dc({
	plugins: [svc()],
});
