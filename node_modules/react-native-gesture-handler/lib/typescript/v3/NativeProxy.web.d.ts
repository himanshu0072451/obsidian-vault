import type { BaseGestureConfig, GestureRelations, SingleGestureName } from './types';
export declare const NativeProxy: {
    readonly createGestureHandler: <T extends Record<string, unknown>>(handlerName: SingleGestureName, handlerTag: number, config?: T) => void;
    readonly setGestureHandlerConfig: <TConfig, THandlerData, TExtendedHandlerData extends THandlerData>(handlerTag: number, newConfig: BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData>) => void;
    readonly updateGestureHandlerConfig: <TConfig, THandlerData, TExtendedHandlerData extends THandlerData>(handlerTag: number, newConfig: BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData>) => void;
    readonly dropGestureHandler: (handlerTag: number) => void;
    readonly configureRelations: (handlerTag: number, relations: GestureRelations) => void;
    readonly installUIRuntimeBindings: () => boolean;
};
//# sourceMappingURL=NativeProxy.web.d.ts.map