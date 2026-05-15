import type { HMRChannel } from "vite";

type Nested = Promise<Array<HMRChannel>>;

type Wrapper<T> = { value: T };

type Deep = Wrapper<Wrapper<HMRChannel>>;

export type Test = Nested | Deep;
