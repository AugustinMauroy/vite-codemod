// Expected warning:
// Warning: Deprecated HotBroadcaster runtime-facing types require manual cleanup.
import type { HMRChannel } from "vite";

function outer() {
    const channels: HMRChannel[] = [];
    {
        const inner: HMRChannel = channels[0];
    }
}

export { outer };
