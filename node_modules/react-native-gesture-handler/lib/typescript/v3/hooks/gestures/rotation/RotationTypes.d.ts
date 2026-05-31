import type { BaseGestureConfig, ExcludeInternalConfigProps, GestureEvent, SingleGesture } from '../../../types';
export type RotationGestureNativeProperties = Record<string, never>;
export type RotationHandlerData = {};
export type RotationExtendedHandlerData = {
    rotation: number;
    velocity: number;
    anchorX: number;
    anchorY: number;
    rotationChange: number;
};
export type RotationGestureProperties = RotationGestureNativeProperties;
export type RotationGestureInternalConfig = BaseGestureConfig<RotationGestureProperties, RotationHandlerData, RotationExtendedHandlerData>;
export type RotationGestureConfig = ExcludeInternalConfigProps<RotationGestureInternalConfig>;
export type RotationGestureEvent = GestureEvent<RotationHandlerData>;
export type RotationGestureActiveEvent = GestureEvent<RotationExtendedHandlerData>;
export type RotationGesture = SingleGesture<RotationGestureProperties, RotationHandlerData, RotationExtendedHandlerData>;
//# sourceMappingURL=RotationTypes.d.ts.map