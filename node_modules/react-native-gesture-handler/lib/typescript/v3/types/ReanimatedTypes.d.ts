export type SharedValue<Value = unknown> = {
    value: Value;
    get(): Value;
    set(value: Value | ((value: Value) => Value)): void;
    addListener: (listenerID: number, listener: (value: Value) => void) => void;
    removeListener: (listenerID: number) => void;
    modify: (modifier?: <T extends Value>(value: T) => T, forceUpdate?: boolean) => void;
};
export type SharedValueOrT<T, P = never> = T | (Exclude<T, undefined> extends P ? SharedValue<Exclude<T, undefined>> : T extends any ? SharedValue<Exclude<T, undefined>> : SharedValue<Exclude<T, undefined>>);
export type WithSharedValue<T, P = never> = T extends object ? WithSharedValueRecursive<T, P> : Simplify<SharedValueOrT<T, P>>;
type WithSharedValueRecursive<T extends object, P> = {
    [K in keyof T]: Exclude<T[K], undefined> extends P ? Simplify<SharedValueOrT<T[K], P>> : boolean extends T[K] ? boolean | SharedValue<boolean> | Extract<T[K], undefined> : T[K] extends [number, number] ? [WithSharedValue<number, P>, WithSharedValue<number, P>] : WithSharedValue<T[K], P>;
};
type Simplify<T> = T extends SharedValue<never> ? never : T extends SharedValue<any> ? T : {
    [K in keyof T]: T[K];
} & NonNullable<unknown>;
export {};
//# sourceMappingURL=ReanimatedTypes.d.ts.map