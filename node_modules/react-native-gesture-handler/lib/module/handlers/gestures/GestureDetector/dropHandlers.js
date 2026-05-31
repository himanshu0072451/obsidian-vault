"use strict";

import { MountRegistry } from '../../../mountRegistry';
import RNGestureHandlerModule from '../../../RNGestureHandlerModule';
import { unregisterHandler } from '../../handlersRegistry';
import { scheduleFlushOperations } from '../../utils';
export function dropHandlers(preparedGesture) {
  for (const handler of preparedGesture.attachedGestures) {
    RNGestureHandlerModule.dropGestureHandler(handler.handlerTag);
    unregisterHandler(handler.handlerTag, handler.config.testId);
    MountRegistry.gestureWillUnmount(handler);
  }
  scheduleFlushOperations();
}
//# sourceMappingURL=dropHandlers.js.map