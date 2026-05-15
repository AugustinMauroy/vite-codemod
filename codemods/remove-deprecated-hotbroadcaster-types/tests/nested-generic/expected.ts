
type Nested = Promise<Array<any>>;

type Wrapper<T> = { value: T };

type Deep = Wrapper<Wrapper<any>>;

export type Test = Nested | Deep;
