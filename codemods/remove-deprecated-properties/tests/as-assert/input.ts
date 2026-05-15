import type { ResolvePluginOptions } from "vite";

declare const resolveOptions: any;

export const tsImporter = (resolveOptions as ResolvePluginOptions).isFromTsImporter;
