"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { getChangeEventCalculator, useClonedAndRemappedConfig } from '../../utils';
function diffCalculator(current, previous) {
  'worklet';

  return {
    rotationChange: previous ? current.rotation - previous.rotation : current.rotation
  };
}
function fillInDefaultValues(event) {
  'worklet';

  event.rotationChange = 0;
}
function transformRotationProps(config) {
  config.changeEventCalculator = getChangeEventCalculator(diffCalculator);
  config.fillInDefaultValues = fillInDefaultValues;
  return config;
}
const RotationPropsMapping = new Map();
const EMPTY_ROTATION_CONFIG = {};
export function useRotationGesture(config = EMPTY_ROTATION_CONFIG) {
  const rotationConfig = useClonedAndRemappedConfig(config, RotationPropsMapping, transformRotationProps);
  return useGesture(SingleGestureName.Rotation, rotationConfig);
}
//# sourceMappingURL=useRotationGesture.js.map