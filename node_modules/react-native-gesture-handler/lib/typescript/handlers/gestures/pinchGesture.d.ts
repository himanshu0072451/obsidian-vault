import type { GestureUpdateEvent } from '../gestureHandlerCommon';
import type { PinchGestureHandlerEventPayload } from '../GestureHandlerEventPayload';
import { ContinousBaseGesture } from './gesture';
/**
 * @deprecated `PinchGestureChangeEventPayload` is deprecated and will be removed in the future. Please use `PinchGestureActiveEvent` instead.
 */
export type PinchGestureChangeEventPayload = {
    scaleChange: number;
};
/**
 * @deprecated `PinchGesture` is deprecated and will be removed in the future. Please use `usePinchGesture` instead.
 */
export declare class PinchGesture extends ContinousBaseGesture<PinchGestureHandlerEventPayload, PinchGestureChangeEventPayload> {
    constructor();
    onChange(callback: (event: GestureUpdateEvent<PinchGestureHandlerEventPayload & PinchGestureChangeEventPayload>) => void): this;
}
/**
 * @deprecated `PinchGestureType` is deprecated and will be removed in the future. Please use `PinchGesture` instead.
 */
export type PinchGestureType = InstanceType<typeof PinchGesture>;
//# sourceMappingURL=pinchGesture.d.ts.map