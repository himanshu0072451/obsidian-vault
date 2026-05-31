"use strict";

import React from 'react';
import { Gestures } from './web/Gestures';
import { GestureHandlerWebDelegate } from './web/tools/GestureHandlerWebDelegate';
import InteractionManager from './web/tools/InteractionManager';
import NodeManager from './web/tools/NodeManager';

// init method is called inside attachGestureHandler function. However, this function may
// fail when received view is not valid HTML element. On the other hand, dropGestureHandler
// will be called even if attach failed, which will result in crash.
//
// We use this flag to check whether or not dropGestureHandler should be called.
let shouldPreventDrop = false;
export default {
  createGestureHandler(handlerName, handlerTag, config) {
    if (!(handlerName in Gestures)) {
      throw new Error(`react-native-gesture-handler: ${handlerName} is not supported on web.`);
    }
    const GestureClass = Gestures[handlerName];
    NodeManager.createGestureHandler(handlerTag, new GestureClass(new GestureHandlerWebDelegate()));
    this.setGestureHandlerConfig(handlerTag, config);
  },
  attachGestureHandler(handlerTag,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newView, actionType, propsRef) {
    if (!(newView instanceof Element || newView instanceof React.Component)) {
      shouldPreventDrop = true;
      const handler = NodeManager.getHandler(handlerTag);
      const handlerName = handler.constructor.name;
      throw new Error(`${handlerName} with tag ${handlerTag} received child that is not valid HTML element.`);
    }

    // @ts-ignore Types should be HTMLElement or React.Component
    NodeManager.getHandler(handlerTag).init(newView, propsRef, actionType);
  },
  detachGestureHandler(handlerTag) {
    if (shouldPreventDrop) {
      shouldPreventDrop = false;
      return;
    }
    NodeManager.detachGestureHandler(handlerTag);
  },
  setGestureHandlerConfig(handlerTag, newConfig) {
    NodeManager.getHandler(handlerTag).setGestureConfig(newConfig);
  },
  updateGestureHandlerConfig(handlerTag, newConfig) {
    NodeManager.getHandler(handlerTag).updateGestureConfig(newConfig);
  },
  getGestureHandlerNode(handlerTag) {
    return NodeManager.getHandler(handlerTag);
  },
  dropGestureHandler(handlerTag) {
    if (shouldPreventDrop) {
      shouldPreventDrop = false;
      return;
    }
    NodeManager.dropGestureHandler(handlerTag);
  },
  configureRelations(handlerTag, relations) {
    if (!NodeManager.hasHandler(handlerTag)) {
      return;
    }
    InteractionManager.instance.configureInteractions(NodeManager.getHandler(handlerTag), relations);
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  flushOperations() {},
  installUIRuntimeBindings() {
    // No-op on web
    return true;
  }
};
//# sourceMappingURL=RNGestureHandlerModule.web.js.map