"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { getChangeEventCalculator, useClonedAndRemappedConfig } from '../../utils';
function diffCalculator(current, previous) {
  'worklet';

  return {
    scaleChange: previous ? current.scale / previous.scale : current.scale
  };
}
function fillInDefaultValues(event) {
  'worklet';

  event.scaleChange = 1;
}
function transformPinchProps(config) {
  config.changeEventCalculator = getChangeEventCalculator(diffCalculator);
  config.fillInDefaultValues = fillInDefaultValues;
  return config;
}
const PinchPropsMapping = new Map();
const EMPTY_PINCH_CONFIG = {};
export function usePinchGesture(config = EMPTY_PINCH_CONFIG) {
  const pinchConfig = useClonedAndRemappedConfig(config, PinchPropsMapping, transformPinchProps);
  return useGesture(SingleGestureName.Pinch, pinchConfig);
}
//# sourceMappingURL=usePinchGesture.js.map