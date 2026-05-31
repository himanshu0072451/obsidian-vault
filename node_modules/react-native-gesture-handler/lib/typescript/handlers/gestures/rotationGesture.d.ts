import type { GestureUpdateEvent } from '../gestureHandlerCommon';
import type { RotationGestureHandlerEventPayload } from '../GestureHandlerEventPayload';
import { ContinousBaseGesture } from './gesture';
type RotationGestureChangeEventPayload = {
    rotationChange: number;
};
/**
 * @deprecated `RotationGesture` is deprecated and will be removed in the future. Please use `useRotationGesture` instead.
 */
export declare class RotationGesture extends ContinousBaseGesture<RotationGestureHandlerEventPayload, RotationGestureChangeEventPayload> {
    constructor();
    onChange(callback: (event: GestureUpdateEvent<RotationGestureHandlerEventPayload & RotationGestureChangeEventPayload>) => void): this;
}
/**
 * @deprecated `RotationGestureType` is deprecated and will be removed in the future. Please use `RotationGesture` instead.
 */
export type RotationGestureType = InstanceType<typeof RotationGesture>;
export {};
//# sourceMappingURL=rotationGesture.d.ts.map