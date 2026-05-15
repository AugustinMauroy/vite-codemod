import type { ViteDevServer } from "vite";

declare const server: ViteDevServer;

export const keys = Object.keys(server.config.legacy ?? {});
