// Expected warning:
// Warning: Deprecated HotBroadcaster runtime-facing types require manual cleanup.
import type { HMRBroadcaster } from 'vite'

export const broadcaster: HMRBroadcaster | null = null
