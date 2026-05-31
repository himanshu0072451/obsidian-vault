"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { useClonedAndRemappedConfig } from '../../utils';
const LongPressPropsMapping = new Map([['minDuration', 'minDurationMs'], ['maxDistance', 'maxDist']]);
function transformLongPressProps(config) {
  if (config.shouldCancelWhenOutside === undefined) {
    config.shouldCancelWhenOutside = true;
  }
  return config;
}
const EMPTY_LONG_PRESS_CONFIG = {};
export function useLongPressGesture(config = EMPTY_LONG_PRESS_CONFIG) {
  const longPressConfig = useClonedAndRemappedConfig(config, LongPressPropsMapping, transformLongPressProps);
  return useGesture(SingleGestureName.LongPress, longPressConfig);
}
//# sourceMappingURL=useLongPressGesture.js.map