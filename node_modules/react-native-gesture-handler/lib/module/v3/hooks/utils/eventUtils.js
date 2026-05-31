"use strict";

import { tagMessage } from '../../../utils';
function isNativeEvent(event) {
  'worklet';

  return 'nativeEvent' in event;
}
export function maybeExtractNativeEvent(event) {
  'worklet';

  return isNativeEvent(event) ? event.nativeEvent : event;
}
export function flattenAndFilterEvent(event) {
  'worklet';

  return {
    handlerTag: event.handlerTag,
    ...event.handlerData
  };
}
export function isEventForHandlerWithTag(handlerTag, event) {
  'worklet';

  return event.handlerTag === handlerTag;
}
export function isNativeAnimatedEvent(callback) {
  'worklet';

  return !!callback && '_argMapping' in callback;
}
export function checkMappingForChangeProperties(animatedEvent) {
  for (const mapping of animatedEvent._argMapping) {
    if (!mapping || !('nativeEvent' in mapping && 'handlerData' in mapping.nativeEvent)) {
      continue;
    }
    for (const key in mapping.nativeEvent.handlerData) {
      if (key.startsWith('change')) {
        throw new Error(tagMessage(`${key} is not available when using Animated.Event.`));
      }
    }
  }
}
export function shouldHandleTouchEvents(config) {
  return !!config.onTouchesDown || !!config.onTouchesMove || !!config.onTouchesUp || !!config.onTouchesCancel;
}
export function getChangeEventCalculator(diffCalculator) {
  'worklet';

  return (current, previous) => {
    'worklet';

    const currentEventData = current.handlerData;
    const previousEventData = previous ? previous.handlerData : null;
    const changePayload = diffCalculator(currentEventData, previousEventData);
    current.handlerData = {
      ...currentEventData,
      ...changePayload
    };
    return current;
  };
}
export function isTouchEvent(event) {
  'worklet';

  return 'allTouches' in event;
}
export function isStateChangeEvent(event) {
  'worklet';

  return 'oldState' in event && event.oldState !== undefined;
}
//# sourceMappingURL=eventUtils.js.map