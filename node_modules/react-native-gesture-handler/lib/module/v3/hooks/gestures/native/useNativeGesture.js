"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { useClonedAndRemappedConfig } from '../../utils';
const EMPTY_NATIVE_CONFIG = {};
export function useNativeGesture(config = EMPTY_NATIVE_CONFIG) {
  const nativeConfig = useClonedAndRemappedConfig(config);
  return useGesture(SingleGestureName.Native, nativeConfig);
}
//# sourceMappingURL=useNativeGesture.js.map