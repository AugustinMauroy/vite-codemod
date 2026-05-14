import type { ModuleRunnerOptions, ResolvePluginOptions, ViteDevServer } from 'vite'

declare const server: ViteDevServer
declare const options: ModuleRunnerOptions
declare const resolveOptions: ResolvePluginOptions

export const legacyProxy = server.config.legacy?.proxySsrExternalModules
