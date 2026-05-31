"use strict";

import RNGestureHandlerModule from '../RNGestureHandlerModule';
export const NativeProxy = {
  createGestureHandler: (handlerName, handlerTag, config) => {
    RNGestureHandlerModule.createGestureHandler(handlerName, handlerTag, config || {});
  },
  setGestureHandlerConfig: (handlerTag, newConfig) => {
    RNGestureHandlerModule.setGestureHandlerConfig(handlerTag, newConfig);
  },
  updateGestureHandlerConfig: (handlerTag, newConfig) => {
    RNGestureHandlerModule.updateGestureHandlerConfig(handlerTag, newConfig);
  },
  dropGestureHandler: handlerTag => {
    RNGestureHandlerModule.dropGestureHandler(handlerTag);
  },
  configureRelations: (handlerTag, relations) => {
    RNGestureHandlerModule.configureRelations(handlerTag, relations);
  },
  installUIRuntimeBindings: () => {
    return RNGestureHandlerModule.installUIRuntimeBindings();
  }
};
//# sourceMappingURL=NativeProxy.web.js.map