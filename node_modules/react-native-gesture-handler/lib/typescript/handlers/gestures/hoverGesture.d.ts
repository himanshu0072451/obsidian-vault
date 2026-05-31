import type { GestureUpdateEvent } from '../gestureHandlerCommon';
import type { HoverGestureHandlerEventPayload } from '../GestureHandlerEventPayload';
import type { BaseGestureConfig } from './gesture';
import { ContinousBaseGesture } from './gesture';
export type HoverGestureChangeEventPayload = {
    changeX: number;
    changeY: number;
};
export declare enum HoverEffect {
    NONE = 0,
    LIFT = 1,
    HIGHLIGHT = 2
}
export interface HoverGestureConfig {
    hoverEffect?: HoverEffect;
}
export declare const hoverGestureHandlerProps: readonly ["hoverEffect"];
/**
 * @deprecated `HoverGesture` is deprecated and will be removed in the future. Please use `useHoverGesture` instead.
 */
export declare class HoverGesture extends ContinousBaseGesture<HoverGestureHandlerEventPayload, HoverGestureChangeEventPayload> {
    config: BaseGestureConfig & HoverGestureConfig;
    constructor();
    /**
     * #### iOS only
     * Sets the visual hover effect.
     */
    effect(effect: HoverEffect): this;
    onChange(callback: (event: GestureUpdateEvent<HoverGestureHandlerEventPayload & HoverGestureChangeEventPayload>) => void): this;
}
/**
 * @deprecated `HoverGestureType` is deprecated and will be removed in the future. Please use `HoverGesture` instead.
 */
export type HoverGestureType = InstanceType<typeof HoverGesture>;
//# sourceMappingURL=hoverGesture.d.ts.map