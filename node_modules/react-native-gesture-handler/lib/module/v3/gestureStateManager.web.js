"use strict";

import { tagMessage } from '../utils';
import GestureHandlerOrchestrator from '../web/tools/GestureHandlerOrchestrator';
import NodeManager from '../web/tools/NodeManager';
function ensureHandlerAttached(handler) {
  if (!handler.attached) {
    throw new Error(tagMessage('Manually handled gesture had not been assigned to any detector'));
  }
}
export const GestureStateManager = {
  activate(handlerTag) {
    'worklet';

    const handler = NodeManager.getHandler(handlerTag);
    ensureHandlerAttached(handler);
    GestureHandlerOrchestrator.instance.recordHandlerIfNotPresent(handler);
    handler.activate(true);
  },
  fail(handlerTag) {
    'worklet';

    const handler = NodeManager.getHandler(handlerTag);
    ensureHandlerAttached(handler);
    handler.fail();
  },
  deactivate(handlerTag) {
    'worklet';

    const handler = NodeManager.getHandler(handlerTag);
    ensureHandlerAttached(handler);
    handler.end();
  }
};
//# sourceMappingURL=gestureStateManager.web.js.map