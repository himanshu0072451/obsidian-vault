import type { FlingGestureConfig } from '../FlingGestureHandler';
import type { FlingGestureHandlerEventPayload } from '../GestureHandlerEventPayload';
import type { BaseGestureConfig } from './gesture';
import { BaseGesture } from './gesture';
/**
 * @deprecated `FlingGesture` is deprecated and will be removed in the future. Please use `useFlingGesture` instead.
 */
export declare class FlingGesture extends BaseGesture<FlingGestureHandlerEventPayload> {
    config: BaseGestureConfig & FlingGestureConfig;
    constructor();
    /**
     * Determine exact number of points required to handle the fling gesture.
     * @param pointers
     */
    numberOfPointers(pointers: number): this;
    /**
     * Expressed allowed direction of movement.
     * Expected values are exported as constants in the Directions object.
     * Arguments can be combined using `|` operator. Default value is set to `Directions.RIGHT`.
     * @param direction
     * @see https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/fling-gesture/#directionvalue-directions
     */
    direction(direction: number): this;
}
/**
 * @deprecated `FlingGestureType` is deprecated and will be removed in the future. Please use `FlingGesture` instead.
 */
export type FlingGestureType = InstanceType<typeof FlingGesture>;
//# sourceMappingURL=flingGesture.d.ts.map