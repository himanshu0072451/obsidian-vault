"use strict";

import { SingleGestureName } from '../../v3/types';
export default class InteractionManager {
  waitForRelations = new Map();
  simultaneousRelations = new Map();
  blocksHandlersRelations = new Map();

  // Private becaues of singleton
  // eslint-disable-next-line no-useless-constructor, @typescript-eslint/no-empty-function
  constructor() {}
  configureInteractions(handler, config) {
    this.dropRelationsForHandlerWithTag(handler.handlerTag);
    if (config.waitFor) {
      const waitFor = [];
      config.waitFor.forEach(otherHandler => {
        waitFor.push(typeof otherHandler === 'number' ? otherHandler : otherHandler.handlerTag);
      });
      this.waitForRelations.set(handler.handlerTag, waitFor);
    }
    if (config.simultaneousHandlers) {
      const simultaneousHandlers = [];
      config.simultaneousHandlers.forEach(otherHandler => {
        simultaneousHandlers.push(typeof otherHandler === 'number' ? otherHandler : otherHandler.handlerTag);
      });
      this.simultaneousRelations.set(handler.handlerTag, simultaneousHandlers);
    }
    if (config.blocksHandlers) {
      const blocksHandlers = [];
      config.blocksHandlers.forEach(otherHandler => {
        blocksHandlers.push(typeof otherHandler === 'number' ? otherHandler : otherHandler.handlerTag);
      });
      this.blocksHandlersRelations.set(handler.handlerTag, blocksHandlers);
    }
  }
  shouldWaitForHandlerFailure(handler, otherHandler) {
    const waitFor = this.waitForRelations.get(handler.handlerTag);
    return waitFor?.find(tag => {
      return tag === otherHandler.handlerTag;
    }) !== undefined;
  }
  shouldRecognizeSimultaneously(handler, otherHandler) {
    const simultaneousHandlers = this.simultaneousRelations.get(handler.handlerTag);
    return simultaneousHandlers?.find(tag => {
      return tag === otherHandler.handlerTag;
    }) !== undefined;
  }
  shouldRequireHandlerToWaitForFailure(handler, otherHandler) {
    const waitFor = this.blocksHandlersRelations.get(handler.handlerTag);
    return waitFor?.find(tag => {
      return tag === otherHandler.handlerTag;
    }) !== undefined;
  }
  shouldHandlerBeCancelledBy(_handler, otherHandler) {
    // We check constructor name instead of using `instanceof` in order do avoid circular dependencies
    const isNativeHandler = otherHandler.name === SingleGestureName.Native;
    const isActive = otherHandler.active;
    const isButton = otherHandler.isButton?.() === true;
    return isNativeHandler && isActive && !isButton;
  }
  dropRelationsForHandlerWithTag(handlerTag) {
    this.waitForRelations.delete(handlerTag);
    this.simultaneousRelations.delete(handlerTag);
    this.blocksHandlersRelations.delete(handlerTag);
  }
  reset() {
    this.waitForRelations.clear();
    this.simultaneousRelations.clear();
    this.blocksHandlersRelations.clear();
  }
  static get instance() {
    if (!this._instance) {
      this._instance = new InteractionManager();
    }
    return this._instance;
  }
}
//# sourceMappingURL=InteractionManager.js.map