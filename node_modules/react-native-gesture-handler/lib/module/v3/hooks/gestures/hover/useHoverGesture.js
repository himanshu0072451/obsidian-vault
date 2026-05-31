"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { getChangeEventCalculator, useClonedAndRemappedConfig } from '../../utils';
function diffCalculator(current, previous) {
  'worklet';

  return {
    changeX: previous ? current.x - previous.x : 0,
    changeY: previous ? current.y - previous.y : 0
  };
}
function fillInDefaultValues(event) {
  'worklet';

  event.changeX = 0;
  event.changeY = 0;
}
function transformHoverProps(config) {
  config.changeEventCalculator = getChangeEventCalculator(diffCalculator);
  config.fillInDefaultValues = fillInDefaultValues;
  return config;
}
const HoverPropsMapping = new Map([['effect', 'hoverEffect']]);
const EMPTY_HOVER_CONFIG = {};
export function useHoverGesture(config = EMPTY_HOVER_CONFIG) {
  const hoverConfig = useClonedAndRemappedConfig(config, HoverPropsMapping, transformHoverProps);
  return useGesture(SingleGestureName.Hover, hoverConfig);
}
//# sourceMappingURL=useHoverGesture.js.map