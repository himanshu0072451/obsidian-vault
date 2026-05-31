"use strict";

import { BaseGesture } from './gesture';

/**
 * @deprecated `LongPressGesture` is deprecated and will be removed in the future. Please use `useLongPressGesture` instead.
 */
export class LongPressGesture extends BaseGesture {
  config = {};
  constructor() {
    super();
    this.handlerName = 'LongPressGestureHandler';
    this.shouldCancelWhenOutside(true);
  }

  /**
   * Minimum time, expressed in milliseconds, that a finger must remain pressed on the corresponding view.
   * The default value is 500.
   * @param duration
   */
  minDuration(duration) {
    this.config.minDurationMs = duration;
    return this;
  }

  /**
   * Maximum distance, expressed in points, that defines how far the finger is allowed to travel during a long press gesture.
   * @param distance
   * @see https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/long-press-gesture#maxdistancevalue-number
   */
  maxDistance(distance) {
    this.config.maxDist = distance;
    return this;
  }

  /**
   * Determine exact number of points required to handle the long press gesture.
   * @param pointers
   */
  numberOfPointers(pointers) {
    this.config.numberOfPointers = pointers;
    return this;
  }
}

/**
 * @deprecated `LongPressGestureType` is deprecated and will be removed in the future. Please use `LongPressGesture` instead.
 */
//# sourceMappingURL=longPressGesture.js.map