"use strict";

import { BaseGesture } from './gesture';

/**
 * @deprecated `NativeGesture` is deprecated and will be removed in the future. Please use `useNativeGesture` instead.
 */
export class NativeGesture extends BaseGesture {
  config = {};
  constructor() {
    super();
    this.handlerName = 'NativeViewGestureHandler';
  }

  /**
   * When true, underlying handler will activate unconditionally when in `BEGAN` or `UNDETERMINED` state.
   * @param value
   */
  shouldActivateOnStart(value) {
    this.config.shouldActivateOnStart = value;
    return this;
  }

  /**
   * When true, cancels all other gesture handlers when this `NativeViewGestureHandler` receives an `ACTIVE` state event.
   * @param value
   */
  disallowInterruption(value) {
    this.config.disallowInterruption = value;
    return this;
  }
}

/**
 * @deprecated `NativeGestureType` is deprecated and will be removed in the future. Please use `NativeGesture` instead.
 */
//# sourceMappingURL=nativeGesture.js.map