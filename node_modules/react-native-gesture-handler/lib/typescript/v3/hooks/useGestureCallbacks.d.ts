import type { AnimatedEvent, BaseGestureConfig, GestureUpdateEventWithHandlerData } from '../types';
export declare function useGestureCallbacks<TConfig, THandlerData, TExtendedHandlerData extends THandlerData>(handlerTag: number, config: BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData>): {
    jsEventHandler: (event: import("../types").GestureHandlerEventWithHandlerData<THandlerData, TExtendedHandlerData>) => void;
    reanimatedEventHandler: ((event: unknown) => void) | undefined;
    animatedEventHandler: AnimatedEvent | ((event: GestureUpdateEventWithHandlerData<TExtendedHandlerData>) => void) | undefined;
};
//# sourceMappingURL=useGestureCallbacks.d.ts.map