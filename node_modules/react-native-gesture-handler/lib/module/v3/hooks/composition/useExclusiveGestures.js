"use strict";

import { ComposedGestureName } from '../../types';
import { useComposedGesture } from './useComposedGesture';
export function useExclusiveGestures(...gestures) {
  const composedGesture = useComposedGesture(ComposedGestureName.Exclusive, ...gestures);
  composedGesture.type = ComposedGestureName.Exclusive;
  return composedGesture;
}
//# sourceMappingURL=useExclusiveGestures.js.map