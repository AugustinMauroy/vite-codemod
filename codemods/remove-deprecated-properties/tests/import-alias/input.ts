import type { ResolvePluginOptions as RPO } from "vite";

declare const resolveOptions: RPO;

export const tsImporter = resolveOptions.isFromTsImporter;
