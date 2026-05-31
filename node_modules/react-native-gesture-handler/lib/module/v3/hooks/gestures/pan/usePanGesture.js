"use strict";

import { SingleGestureName } from '../../../types';
import { useGesture } from '../../useGesture';
import { getChangeEventCalculator, maybeUnpackValue, useClonedAndRemappedConfig } from '../../utils';
const PanPropsMapping = new Map([['minDistance', 'minDist'], ['averageTouches', 'avgTouches']]);
function validateOffsetsArray(offsets, propName) {
  if (offsets === undefined) {
    return;
  }
  if (!Array.isArray(offsets)) {
    return;
  }
  const offsetStart = maybeUnpackValue(offsets[0]);
  const offsetEnd = maybeUnpackValue(offsets[1]);
  if (offsetStart > 0 || offsetEnd < 0) {
    throw new Error(`First element of ${propName} should be negative, and the second one should be positive`);
  }
}
function validatePanConfig(config) {
  validateOffsetsArray(config.activeOffsetX, 'activeOffsetX');
  validateOffsetsArray(config.activeOffsetY, 'activeOffsetY');
  validateOffsetsArray(config.failOffsetX, 'failOffsetX');
  validateOffsetsArray(config.failOffsetY, 'failOffsetY');
  if (config.minDistance !== undefined && (config.failOffsetX !== undefined || config.failOffsetY !== undefined)) {
    throw new Error(`It is not supported to use minDistance with failOffsetX or failOffsetY, use activeOffsetX and activeOffsetY instead`);
  }
  if (config.minDistance !== undefined && (config.activeOffsetX !== undefined || config.activeOffsetY !== undefined)) {
    throw new Error(`It is not supported to use minDistance with activeOffsetX or activeOffsetY`);
  }
}
function transformOffsetProp(config, propName) {
  const propValue = config[propName];
  if (propValue === undefined) {
    return;
  }
  if (Array.isArray(propValue)) {
    config[`${propName}Start`] = propValue[0];
    config[`${propName}End`] = propValue[1];
  } else {
    const offsetValue = maybeUnpackValue(propValue);
    if (offsetValue < 0) {
      config[`${propName}Start`] = propValue;
    } else {
      config[`${propName}End`] = propValue;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete config[propName];
}
function diffCalculator(current, previous) {
  'worklet';

  return {
    changeX: previous ? current.translationX - previous.translationX : current.translationX,
    changeY: previous ? current.translationY - previous.translationY : current.translationY
  };
}
function fillInDefaultValues(event) {
  'worklet';

  event.changeX = 0;
  event.changeY = 0;
}
function transformPanProps(config) {
  transformOffsetProp(config, 'activeOffsetY');
  transformOffsetProp(config, 'failOffsetX');
  transformOffsetProp(config, 'failOffsetY');
  transformOffsetProp(config, 'activeOffsetX');
  config.changeEventCalculator = getChangeEventCalculator(diffCalculator);
  config.fillInDefaultValues = fillInDefaultValues;
  return config;
}
const EMPTY_PAN_CONFIG = {};
export function usePanGesture(config = EMPTY_PAN_CONFIG) {
  if (__DEV__) {
    validatePanConfig(config);
  }
  const panConfig = useClonedAndRemappedConfig(config, PanPropsMapping, transformPanProps);
  return useGesture(SingleGestureName.Pan, panConfig);
}
//# sourceMappingURL=usePanGesture.js.map