"use strict";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class NodeManager {
  static gestures = {};
  static observers = new Map();
  static getHandler(tag) {
    if (tag in this.gestures) {
      return this.gestures[tag];
    }
    throw new Error(`No handler for tag ${tag}`);
  }
  static hasHandler(tag) {
    return tag in this.gestures;
  }
  static createGestureHandler(handlerTag, handler) {
    if (handlerTag in this.gestures) {
      throw new Error(`Handler with tag ${handlerTag} already exists. Please ensure that no Gesture instance is used across multiple GestureDetectors.`);
    }
    this.gestures[handlerTag] = handler;
    this.gestures[handlerTag].handlerTag = handlerTag;
    const pending = this.observers.get(handlerTag);
    if (pending) {
      // Snapshot before iterating — callbacks may call back into observeHandler / cancelObservation
      // and mutate the underlying map.
      for (const callback of Array.from(pending.values())) {
        callback(handler);
      }
    }
  }
  static dropGestureHandler(handlerTag) {
    if (!(handlerTag in this.gestures)) {
      return;
    }
    this.gestures[handlerTag].onDestroy();

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.gestures[handlerTag];
  }
  static detachGestureHandler(handlerTag) {
    if (!(handlerTag in this.gestures)) {
      return;
    }
    this.gestures[handlerTag].detach();
  }

  // Invokes `callback` every time a handler with `tag` is created and, if the handler already exists,
  // immediately before returning. The observation persists until explicitly cancelled: the registry
  // holds both `owner` and `callback` strongly, so callers MUST call `cancelObservation` or
  // `cancelAllObservationsForOwner` when the owner is going away (typically in effect cleanup) to
  // avoid leaking. Observing the same tag twice with the same `owner` replaces the previous callback.
  static observeHandler(tag, owner, callback) {
    let table = this.observers.get(tag);
    if (!table) {
      table = new Map();
      this.observers.set(tag, table);
    }
    table.set(owner, callback);
    if (tag in this.gestures) {
      callback(this.gestures[tag]);
    }
  }
  static cancelObservation(tag, owner) {
    const table = this.observers.get(tag);
    if (!table) {
      return;
    }
    table.delete(owner);
    if (table.size === 0) {
      this.observers.delete(tag);
    }
  }
  static cancelAllObservationsForOwner(owner) {
    for (const tag of this.observers.keys()) {
      this.cancelObservation(tag, owner);
    }
  }
  static get nodes() {
    return {
      ...this.gestures
    };
  }
}
//# sourceMappingURL=NodeManager.js.map