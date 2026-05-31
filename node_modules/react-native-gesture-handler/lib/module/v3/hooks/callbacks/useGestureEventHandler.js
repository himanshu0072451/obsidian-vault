"use strict";

import { useMemo } from 'react';
import { eventHandler } from './eventHandler';
export function useGestureEventHandler(handlerTag, handlers, config) {
  const jsContext = useMemo(() => {
    return {
      lastUpdateEvent: undefined
    };
  }, []);
  return useMemo(() => {
    return event => {
      eventHandler(handlerTag, event, handlers, config.changeEventCalculator, jsContext, !!config.dispatchesAnimatedEvents, config.fillInDefaultValues);
    };
  }, [handlerTag, handlers, config.changeEventCalculator, config.dispatchesAnimatedEvents, config.fillInDefaultValues, jsContext]);
}
//# sourceMappingURL=useGestureEventHandler.js.map