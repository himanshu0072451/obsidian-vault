"use strict";

import { scheduleOperationToBeFlushed } from '../handlers/utils';
import RNGestureHandlerModule from '../RNGestureHandlerModule';
// Destructure functions that can be called on the UI thread to have
// a raw HostFunction reference
const {
  flushOperations,
  updateGestureHandlerConfig
} = RNGestureHandlerModule;
export const NativeProxy = {
  createGestureHandler: (handlerName, handlerTag, config) => {
    scheduleOperationToBeFlushed(() => {
      RNGestureHandlerModule.createGestureHandler(handlerName, handlerTag, config || {});
    });
  },
  setGestureHandlerConfig: (handlerTag, newConfig) => {
    scheduleOperationToBeFlushed(() => {
      RNGestureHandlerModule.setGestureHandlerConfig(handlerTag, newConfig);
    });
  },
  // updateGestureHandlerConfig can be called on the UI thread when using
  // SharedValue binding. Therefore, it needs to be a worklet and we flush
  // immediately since we're likely already on the UI thread.
  updateGestureHandlerConfig: (handlerTag, newConfig) => {
    'worklet';

    updateGestureHandlerConfig(handlerTag, newConfig);
    flushOperations();
  },
  dropGestureHandler: handlerTag => {
    scheduleOperationToBeFlushed(() => {
      RNGestureHandlerModule.dropGestureHandler(handlerTag);
    });
  },
  configureRelations: (handlerTag, relations) => {
    scheduleOperationToBeFlushed(() => {
      RNGestureHandlerModule.configureRelations(handlerTag, relations);
    });
  },
  installUIRuntimeBindings: () => {
    return RNGestureHandlerModule.installUIRuntimeBindings();
  }
};
//# sourceMappingURL=NativeProxy.js.map