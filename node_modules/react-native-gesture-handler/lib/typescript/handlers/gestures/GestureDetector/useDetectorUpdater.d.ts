import type React from 'react';
import type { PropsRef } from '../../../web/interfaces';
import type { GestureType } from '../gesture';
import type { ComposedGesture } from '../gestureComposition';
import type { AttachedGestureState, GestureDetectorState } from './types';
export declare function useDetectorUpdater(state: GestureDetectorState, preparedGesture: AttachedGestureState, gesturesToAttach: GestureType[], gestureConfig: ComposedGesture | GestureType, webEventHandlersRef: React.RefObject<PropsRef>): (skipConfigUpdate?: boolean) => void;
//# sourceMappingURL=useDetectorUpdater.d.ts.map