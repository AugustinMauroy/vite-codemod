import type { ModuleRunnerOptions, ResolvePluginOptions, ViteDevServer } from "vite";

declare const server: ViteDevServer;
declare const options: ModuleRunnerOptions;
declare const resolveOptions: ResolvePluginOptions;

export const legacyProxy = undefined;
export const importGlobMap = undefined;
export const moduleRunnerRoot = undefined;
export const tsImporter = undefined;
export const depsOptimizer = undefined;
export const externalize = undefined;
export const ssrConfig = undefined;
