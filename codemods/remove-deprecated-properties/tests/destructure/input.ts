import type { ModuleRunnerOptions } from "vite";

declare const options: ModuleRunnerOptions;

const { root } = options;
export const r = root;
