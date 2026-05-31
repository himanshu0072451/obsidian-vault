"use strict";

import { BaseGesture } from './gesture';

/**
 * @deprecated `FlingGesture` is deprecated and will be removed in the future. Please use `useFlingGesture` instead.
 */
export class FlingGesture extends BaseGesture {
  config = {};
  constructor() {
    super();
    this.handlerName = 'FlingGestureHandler';
  }

  /**
   * Determine exact number of points required to handle the fling gesture.
   * @param pointers
   */
  numberOfPointers(pointers) {
    this.config.numberOfPointers = pointers;
    return this;
  }

  /**
   * Expressed allowed direction of movement.
   * Expected values are exported as constants in the Directions object.
   * Arguments can be combined using `|` operator. Default value is set to `Directions.RIGHT`.
   * @param direction
   * @see https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/fling-gesture/#directionvalue-directions
   */
  direction(direction) {
    this.config.direction = direction;
    return this;
  }
}

/**
 * @deprecated `FlingGestureType` is deprecated and will be removed in the future. Please use `FlingGesture` instead.
 */
//# sourceMappingURL=flingGesture.js.map