// Expected warning:
// Warning: Unable to safely remove splitVendorChunkPlugin from conditional plugin logic.
import { defineConfig as dc, splitVendorChunkPlugin as svc } from "vite";

const shouldSplit = true;

export default dc({
	plugins: [shouldSplit ? svc() : undefined].filter(Boolean),
});
