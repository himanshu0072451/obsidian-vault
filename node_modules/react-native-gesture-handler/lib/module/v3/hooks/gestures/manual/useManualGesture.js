"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { useClonedAndRemappedConfig } from '../../utils';
const EMPTY_MANUAL_CONFIG = {};
export function useManualGesture(config = EMPTY_MANUAL_CONFIG) {
  const manualConfig = useClonedAndRemappedConfig(config);
  return useGesture(SingleGestureName.Manual, manualConfig);
}
//# sourceMappingURL=useManualGesture.js.map