"use strict";

import { State } from '../../State';
import { tagMessage } from '../../utils';

/**
 * @deprecated `LegacyGestureStateManagerType` is deprecated and will be removed in the future. Please use the new, hook-based API instead.
 */

const wrappedSetGestureState = (handlerTag, state) => {
  'worklet';

  if (globalThis._setGestureStateSync) {
    globalThis._setGestureStateSync(handlerTag, state);
  } else if (globalThis._setGestureStateAsync) {
    globalThis._setGestureStateAsync(handlerTag, state);
  } else {
    throw new Error(tagMessage('Failed to set gesture state'));
  }
};
function create(handlerTag) {
  'worklet';

  return {
    handlerTag,
    begin: () => {
      'worklet';

      wrappedSetGestureState(handlerTag, State.BEGAN);
    },
    activate: () => {
      'worklet';

      wrappedSetGestureState(handlerTag, State.ACTIVE);
    },
    fail: () => {
      'worklet';

      wrappedSetGestureState(handlerTag, State.FAILED);
    },
    end: () => {
      'worklet';

      wrappedSetGestureState(handlerTag, State.END);
    }
  };
}

/**
 * @deprecated `LegacyGestureStateManager` is deprecated and will be removed in the future. Please use the new, hook-based API instead.
 */
export const GestureStateManager = {
  create
};
//# sourceMappingURL=gestureStateManager.js.map