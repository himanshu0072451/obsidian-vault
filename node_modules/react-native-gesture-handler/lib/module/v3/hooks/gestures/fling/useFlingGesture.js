"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { useClonedAndRemappedConfig } from '../../utils';
const EMPTY_FLING_CONFIG = {};
export function useFlingGesture(config = EMPTY_FLING_CONFIG) {
  const flingConfig = useClonedAndRemappedConfig(config);
  return useGesture(SingleGestureName.Fling, flingConfig);
}
//# sourceMappingURL=useFlingGesture.js.map