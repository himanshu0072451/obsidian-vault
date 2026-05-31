"use strict";

import { ComposedGestureName } from '../../types';
import { useComposedGesture } from './useComposedGesture';
export function useSimultaneousGestures(...gestures) {
  const composedGesture = useComposedGesture(ComposedGestureName.Simultaneous, ...gestures);
  return composedGesture;
}
//# sourceMappingURL=useSimultaneousGestures.js.map