"use strict";

import { ContinousBaseGesture } from './gesture';
function changeEventCalculator(current, _previous) {
  'worklet';

  return current;
}

/**
 * @deprecated `ManualGesture` is deprecated and will be removed in the future. Please use `useManualGesture` instead.
 */
export class ManualGesture extends ContinousBaseGesture {
  constructor() {
    super();
    this.handlerName = 'ManualGestureHandler';
  }
  onChange(callback) {
    // @ts-ignore TS being overprotective, Record<string, never> is Record
    this.handlers.changeEventCalculator = changeEventCalculator;
    return super.onChange(callback);
  }
}

/**
 * @deprecated `ManualGestureType` is deprecated and will be removed in the future. Please use `ManualGesture` instead.
 */
//# sourceMappingURL=manualGesture.js.map