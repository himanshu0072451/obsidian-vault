import type { NativeViewGestureHandlerPayload } from '../GestureHandlerEventPayload';
import type { NativeViewGestureConfig } from '../NativeViewGestureHandler';
import type { BaseGestureConfig } from './gesture';
import { BaseGesture } from './gesture';
/**
 * @deprecated `NativeGesture` is deprecated and will be removed in the future. Please use `useNativeGesture` instead.
 */
export declare class NativeGesture extends BaseGesture<NativeViewGestureHandlerPayload> {
    config: BaseGestureConfig & NativeViewGestureConfig;
    constructor();
    /**
     * When true, underlying handler will activate unconditionally when in `BEGAN` or `UNDETERMINED` state.
     * @param value
     */
    shouldActivateOnStart(value: boolean): this;
    /**
     * When true, cancels all other gesture handlers when this `NativeViewGestureHandler` receives an `ACTIVE` state event.
     * @param value
     */
    disallowInterruption(value: boolean): this;
}
/**
 * @deprecated `NativeGestureType` is deprecated and will be removed in the future. Please use `NativeGesture` instead.
 */
export type NativeGestureType = InstanceType<typeof NativeGesture>;
//# sourceMappingURL=nativeGesture.d.ts.map