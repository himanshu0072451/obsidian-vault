import type { SharedValue } from '../../../v3/types';
import type { GestureType, HandlerCallbacks } from '../gesture';
export interface AttachedGestureState {
    attachedGestures: GestureType[];
    animatedEventHandler: unknown;
    animatedHandlers: SharedValue<HandlerCallbacks<Record<string, unknown>>[] | null> | null;
    shouldUseReanimated: boolean;
    isMounted: boolean;
}
export interface GestureDetectorState {
    firstRender: boolean;
    viewRef: React.Component | null;
    previousViewTag: number;
    forceRebuildReanimatedEvent: boolean;
}
//# sourceMappingURL=types.d.ts.map