"use strict";

import { ContinousBaseGesture } from './gesture';

/**
 * @deprecated `PinchGestureChangeEventPayload` is deprecated and will be removed in the future. Please use `PinchGestureActiveEvent` instead.
 */

function changeEventCalculator(current, previous) {
  'worklet';

  let changePayload;
  if (previous === undefined) {
    changePayload = {
      scaleChange: current.scale
    };
  } else {
    changePayload = {
      scaleChange: current.scale / previous.scale
    };
  }
  return {
    ...current,
    ...changePayload
  };
}

/**
 * @deprecated `PinchGesture` is deprecated and will be removed in the future. Please use `usePinchGesture` instead.
 */
export class PinchGesture extends ContinousBaseGesture {
  constructor() {
    super();
    this.handlerName = 'PinchGestureHandler';
  }
  onChange(callback) {
    // @ts-ignore TS being overprotective, PinchGestureHandlerEventPayload is Record
    this.handlers.changeEventCalculator = changeEventCalculator;
    return super.onChange(callback);
  }
}

/**
 * @deprecated `PinchGestureType` is deprecated and will be removed in the future. Please use `PinchGesture` instead.
 */
//# sourceMappingURL=pinchGesture.js.map