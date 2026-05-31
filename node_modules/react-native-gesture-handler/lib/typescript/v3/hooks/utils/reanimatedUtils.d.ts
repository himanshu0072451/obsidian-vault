import type { BaseGestureConfig, SharedValueOrT } from '../../types';
export declare const SHARED_VALUE_OFFSET = 1.618;
export declare function bindSharedValues<TConfig, THandlerData, TExtendedHandlerData extends THandlerData>(config: BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData>, handlerTag: number): void;
export declare function unbindSharedValues<TConfig, THandlerData, TExtendedHandlerData extends THandlerData>(config: BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData>, handlerTag: number): void;
export declare function hasWorkletEventHandlers<TConfig, THandlerData, TExtendedHandlerData extends THandlerData>(config: BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData>): boolean;
export declare function maybeUnpackValue<T>(v: SharedValueOrT<T, boolean> | undefined): T;
//# sourceMappingURL=reanimatedUtils.d.ts.map