import type { BaseGestureConfig, ExcludeInternalConfigProps, GestureEvent, SingleGesture } from '../../../types';
export type PinchGestureNativeProperties = Record<string, never>;
export type PinchHandlerData = {};
export type PinchExtendedHandlerData = {
    scale: number;
    velocity: number;
    focalX: number;
    focalY: number;
    scaleChange: number;
};
export type PinchGestureProperties = PinchGestureNativeProperties;
export type PinchGestureInternalConfig = BaseGestureConfig<PinchGestureProperties, PinchHandlerData, PinchExtendedHandlerData>;
export type PinchGestureConfig = ExcludeInternalConfigProps<PinchGestureInternalConfig>;
export type PinchGestureEvent = GestureEvent<PinchHandlerData>;
export type PinchGestureActiveEvent = GestureEvent<PinchExtendedHandlerData>;
export type PinchGesture = SingleGesture<PinchGestureProperties, PinchHandlerData, PinchExtendedHandlerData>;
//# sourceMappingURL=PinchTypes.d.ts.map