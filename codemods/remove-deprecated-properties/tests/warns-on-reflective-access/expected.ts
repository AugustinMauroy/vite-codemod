// Expected warning:
// Warning: Reflective access to deprecated properties cannot be migrated safely.
import type { ViteDevServer } from 'vite'

declare const server: ViteDevServer

export const keys = Object.keys(server.config.legacy ?? {})
