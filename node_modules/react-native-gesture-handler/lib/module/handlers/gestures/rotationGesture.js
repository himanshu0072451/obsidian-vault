"use strict";

import { ContinousBaseGesture } from './gesture';
function changeEventCalculator(current, previous) {
  'worklet';

  let changePayload;
  if (previous === undefined) {
    changePayload = {
      rotationChange: current.rotation
    };
  } else {
    changePayload = {
      rotationChange: current.rotation - previous.rotation
    };
  }
  return {
    ...current,
    ...changePayload
  };
}

/**
 * @deprecated `RotationGesture` is deprecated and will be removed in the future. Please use `useRotationGesture` instead.
 */
export class RotationGesture extends ContinousBaseGesture {
  constructor() {
    super();
    this.handlerName = 'RotationGestureHandler';
  }
  onChange(callback) {
    // @ts-ignore TS being overprotective, RotationGestureHandlerEventPayload is Record
    this.handlers.changeEventCalculator = changeEventCalculator;
    return super.onChange(callback);
  }
}

/**
 * @deprecated `RotationGestureType` is deprecated and will be removed in the future. Please use `RotationGesture` instead.
 */
//# sourceMappingURL=rotationGesture.js.map