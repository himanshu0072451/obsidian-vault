import type { ForceTouchGestureConfig } from '../ForceTouchGestureHandler';
import type { GestureUpdateEvent } from '../gestureHandlerCommon';
import type { ForceTouchGestureHandlerEventPayload } from '../GestureHandlerEventPayload';
import type { BaseGestureConfig } from './gesture';
import { ContinousBaseGesture } from './gesture';
/**
 * @deprecated `ForceTouchGestureChangeEventPayload` is deprecated and will be removed in the future.
 */
export type ForceTouchGestureChangeEventPayload = {
    forceChange: number;
};
/**
 * @deprecated `ForceTouchGesture` is deprecated and will be removed in the future.
 */
export declare class ForceTouchGesture extends ContinousBaseGesture<ForceTouchGestureHandlerEventPayload, ForceTouchGestureChangeEventPayload> {
    config: BaseGestureConfig & ForceTouchGestureConfig;
    constructor();
    /**
     * A minimal pressure that is required before gesture can activate.
     * Should be a value from range [0.0, 1.0]. Default is 0.2.
     * @param force
     */
    minForce(force: number): this;
    /**
     * A maximal pressure that could be applied for gesture.
     * If the pressure is greater, gesture fails. Should be a value from range [0.0, 1.0].
     * @param force
     */
    maxForce(force: number): this;
    /**
     * Value defining if haptic feedback has to be performed on activation.
     * @param value
     */
    feedbackOnActivation(value: boolean): this;
    onChange(callback: (event: GestureUpdateEvent<GestureUpdateEvent<ForceTouchGestureHandlerEventPayload & ForceTouchGestureChangeEventPayload>>) => void): this;
}
/**
 * @deprecated `ForceTouchGestureType` is deprecated and will be removed in the future.
 */
export type ForceTouchGestureType = InstanceType<typeof ForceTouchGesture>;
//# sourceMappingURL=forceTouchGesture.d.ts.map