import type React from 'react';
import type { PropsRef } from '../../../web/interfaces';
import type { GestureType } from '../gesture';
import type { ComposedGesture } from '../gestureComposition';
import type { AttachedGestureState } from './types';
interface AttachHandlersConfig {
    preparedGesture: AttachedGestureState;
    gestureConfig: ComposedGesture | GestureType;
    gesturesToAttach: GestureType[];
    viewTag: number;
    webEventHandlersRef: React.RefObject<PropsRef>;
}
export declare function attachHandlers({ preparedGesture, gestureConfig, gesturesToAttach, viewTag, webEventHandlersRef, }: AttachHandlersConfig): void;
export {};
//# sourceMappingURL=attachHandlers.d.ts.map