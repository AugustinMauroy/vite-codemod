import type { ModuleRunnerOptions, ViteDevServer } from "vite";

declare const server: ViteDevServer;
declare const options: ModuleRunnerOptions;

export const config = {
	legacyProxy: server.config.legacy?.proxySsrExternalModules,
	moduleRunnerRoot: options.root ?? "/tmp",
};
