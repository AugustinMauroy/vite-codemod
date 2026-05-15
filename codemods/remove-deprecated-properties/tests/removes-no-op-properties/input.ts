import type { ModuleRunnerOptions, ResolvePluginOptions, ViteDevServer } from "vite";

declare const server: ViteDevServer;
declare const options: ModuleRunnerOptions;
declare const resolveOptions: ResolvePluginOptions;

export const legacyProxy = server.config.legacy?.proxySsrExternalModules;
export const importGlobMap = server._importGlobMap;
export const moduleRunnerRoot = options.root;
export const tsImporter = resolveOptions.isFromTsImporter;
export const depsOptimizer = resolveOptions.getDepsOptimizer;
export const externalize = resolveOptions.shouldExternalize;
export const ssrConfig = resolveOptions.ssrConfig;
