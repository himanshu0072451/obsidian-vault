"use strict";

import { ComposedGestureName } from '../../types';
import { useComposedGesture } from './useComposedGesture';
export function useCompetingGestures(...gestures) {
  return useComposedGesture(ComposedGestureName.Race, ...gestures);
}
//# sourceMappingURL=useCompetingGestures.js.map