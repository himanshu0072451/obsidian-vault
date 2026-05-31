import type { Gesture, GestureRelations } from '../types';
export declare const traverseAndConfigureRelations: (node: Gesture, relationsByTag: Map<number, GestureRelations>, simultaneousHandlers: Set<number>, waitFor?: number[]) => void;
export declare function configureRelations<TConfig, THandlerData>(gesture: Gesture<TConfig, THandlerData>): Map<number, GestureRelations>;
export declare function ensureNativeDetectorComponent(NativeDetectorComponent: unknown): asserts NativeDetectorComponent;
export declare const EMPTY_SET: Set<number>;
//# sourceMappingURL=utils.d.ts.map