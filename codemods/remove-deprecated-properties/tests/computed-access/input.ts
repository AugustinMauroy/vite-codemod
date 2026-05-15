import type { ResolvePluginOptions } from "vite";

declare const resolveOptions: ResolvePluginOptions;

export const tsImporter = resolveOptions['isFromTsImporter'];
