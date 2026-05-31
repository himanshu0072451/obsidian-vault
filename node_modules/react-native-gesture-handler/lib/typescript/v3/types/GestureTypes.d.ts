import type { CommonGestureConfig, ComposedGestureConfig, GestureCallbacks, GestureRelations, InternalConfigProps } from './ConfigTypes';
import type { DetectorCallbacks } from './DetectorTypes';
import type { FilterNeverProperties } from './UtilityTypes';
export type ExternalRelations = {
    simultaneousWith?: AnyGesture | AnyGesture[] | undefined;
    requireToFail?: AnyGesture | AnyGesture[] | undefined;
    block?: AnyGesture | AnyGesture[] | undefined;
};
export type BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData extends THandlerData = THandlerData> = ExternalRelations & GestureCallbacks<THandlerData, TExtendedHandlerData> & FilterNeverProperties<TConfig> & InternalConfigProps<TExtendedHandlerData> & CommonGestureConfig;
export type BaseDiscreteGestureConfig<TConfig, THandlerData, TExtendedHandlerData extends THandlerData = THandlerData> = Omit<BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData>, 'onUpdate'>;
export type SingleGesture<TConfig, THandlerData, TExtendedHandlerData extends THandlerData = THandlerData> = {
    handlerTag: number;
    type: SingleGestureName;
    config: BaseGestureConfig<TConfig, THandlerData, TExtendedHandlerData>;
    detectorCallbacks: DetectorCallbacks<THandlerData, TExtendedHandlerData>;
    gestureRelations: GestureRelations;
};
export type DiscreteSingleGesture<TConfig, THandlerData, TExtendedHandlerData extends THandlerData = THandlerData> = {
    [K in keyof SingleGesture<TConfig, THandlerData, TExtendedHandlerData>]: K extends 'config' ? Omit<SingleGesture<TConfig, THandlerData, TExtendedHandlerData>[K], 'onUpdate'> : SingleGesture<TConfig, THandlerData, TExtendedHandlerData>[K];
};
export type ComposedGesture = {
    handlerTags: number[];
    type: ComposedGestureName;
    config: ComposedGestureConfig;
    detectorCallbacks: DetectorCallbacks<unknown, unknown>;
    externalSimultaneousHandlers: number[];
    gestures: Gesture[];
};
export type Gesture<TConfig = unknown, THandlerData = unknown, TExtendedHandlerData extends THandlerData = THandlerData> = SingleGesture<TConfig, THandlerData, TExtendedHandlerData> | ComposedGesture;
export type AnyGesture = Gesture<unknown, any>;
export declare enum SingleGestureName {
    Tap = "TapGestureHandler",
    LongPress = "LongPressGestureHandler",
    Pan = "PanGestureHandler",
    Pinch = "PinchGestureHandler",
    Rotation = "RotationGestureHandler",
    Fling = "FlingGestureHandler",
    Manual = "ManualGestureHandler",
    Native = "NativeViewGestureHandler",
    Hover = "HoverGestureHandler"
}
export declare enum ComposedGestureName {
    Simultaneous = "SimultaneousGesture",
    Exclusive = "ExclusiveGesture",
    Race = "RaceGesture"
}
//# sourceMappingURL=GestureTypes.d.ts.map