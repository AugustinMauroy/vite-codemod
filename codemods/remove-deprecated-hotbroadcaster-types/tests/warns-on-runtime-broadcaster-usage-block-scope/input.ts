import type { HMRChannel } from "vite";

function outer() {
    const channels: HMRChannel[] = [];
    {
        const inner: HMRChannel = channels[0];
    }
}

export { outer };
