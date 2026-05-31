import type { GestureUpdateEvent } from '../gestureHandlerCommon';
import { ContinousBaseGesture } from './gesture';
/**
 * @deprecated `ManualGesture` is deprecated and will be removed in the future. Please use `useManualGesture` instead.
 */
export declare class ManualGesture extends ContinousBaseGesture<Record<string, never>, Record<string, never>> {
    constructor();
    onChange(callback: (event: GestureUpdateEvent<Record<string, never>>) => void): this;
}
/**
 * @deprecated `ManualGestureType` is deprecated and will be removed in the future. Please use `ManualGesture` instead.
 */
export type ManualGestureType = InstanceType<typeof ManualGesture>;
//# sourceMappingURL=manualGesture.d.ts.map