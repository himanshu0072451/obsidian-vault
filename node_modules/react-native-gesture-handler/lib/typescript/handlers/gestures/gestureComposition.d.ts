import type { GestureType } from './gesture';
import { Gesture } from './gesture';
/**
 * @deprecated `ComposedGesture` is deprecated and will be removed in the future. Please use `useCompetingGestures` instead.
 */
export declare class ComposedGesture extends Gesture {
    protected gestures: Gesture[];
    protected simultaneousGestures: GestureType[];
    protected requireGesturesToFail: GestureType[];
    constructor(...gestures: Gesture[]);
    protected prepareSingleGesture(gesture: Gesture, simultaneousGestures: GestureType[], requireGesturesToFail: GestureType[]): void;
    prepare(): void;
    initialize(): void;
    toGestureArray(): GestureType[];
}
/**
 * @deprecated `SimultaneousGesture` is deprecated and will be removed in the future. Please use `useSimultaneousGestures` instead.
 */
export declare class SimultaneousGesture extends ComposedGesture {
    prepare(): void;
}
/**
 * @deprecated `ExclusiveGesture` is deprecated and will be removed in the future. Please use `useExclusiveGestures` instead.
 */
export declare class ExclusiveGesture extends ComposedGesture {
    prepare(): void;
}
/**
 * @deprecated `ComposedGestureType` is deprecated and will be removed in the future. Please use `ComposedGesture` instead.
 */
export type ComposedGestureType = InstanceType<typeof ComposedGesture>;
/**
 * @deprecated `RaceGestureType` is deprecated and will be removed in the future. Please use `ComposedGesture` instead.
 */
export type RaceGestureType = ComposedGestureType;
/**
 * @deprecated `SimultaneousGestureType` is deprecated and will be removed in the future. Please use `ComposedGesture` instead.
 */
export type SimultaneousGestureType = InstanceType<typeof SimultaneousGesture>;
/**
 * @deprecated `ExclusiveGestureType` is deprecated and will be removed in the future. Please use `ComposedGesture` instead.
 */
export type ExclusiveGestureType = InstanceType<typeof ExclusiveGesture>;
//# sourceMappingURL=gestureComposition.d.ts.map