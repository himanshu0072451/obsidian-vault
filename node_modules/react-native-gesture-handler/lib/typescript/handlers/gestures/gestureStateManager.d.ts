/**
 * @deprecated `LegacyGestureStateManagerType` is deprecated and will be removed in the future. Please use the new, hook-based API instead.
 */
export interface GestureStateManagerType {
    begin: () => void;
    activate: () => void;
    fail: () => void;
    end: () => void;
    /** @internal */
    handlerTag: number;
}
declare function create(handlerTag: number): GestureStateManagerType;
/**
 * @deprecated `LegacyGestureStateManager` is deprecated and will be removed in the future. Please use the new, hook-based API instead.
 */
export declare const GestureStateManager: {
    create: typeof create;
};
export {};
//# sourceMappingURL=gestureStateManager.d.ts.map