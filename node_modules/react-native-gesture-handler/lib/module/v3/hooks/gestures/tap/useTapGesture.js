"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { useClonedAndRemappedConfig } from '../../utils';
const TapPropsMapping = new Map([['maxDistance', 'maxDist'], ['maxDuration', 'maxDurationMs'], ['maxDelay', 'maxDelayMs']]);
const EMPTY_TAP_CONFIG = {};
export function useTapGesture(config = EMPTY_TAP_CONFIG) {
  const tapConfig = useClonedAndRemappedConfig(config, TapPropsMapping);
  return useGesture(SingleGestureName.Tap, tapConfig);
}
//# sourceMappingURL=useTapGesture.js.map