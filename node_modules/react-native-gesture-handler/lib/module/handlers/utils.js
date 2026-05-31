"use strict";

import { findNodeHandle as findNodeHandleRN, Platform } from 'react-native';
import { ghQueueMicrotask } from '../ghQueueMicrotask';
import RNGestureHandlerModule from '../RNGestureHandlerModule';
import { toArray } from '../utils';
import { handlerIDToTag } from './handlersRegistry';
function isConfigParam(param, name) {
  // param !== Object(param) returns false if `param` is a function
  // or an object and returns true if `param` is null
  return param !== undefined && (param !== Object(param) || !('__isNative' in param)) && name !== 'onHandlerStateChange' && name !== 'onGestureEvent';
}
export const selectProperties = (obj, keys) => Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]));
export function filterConfig(props, validProps, defaults = {}) {
  const filteredConfig = {
    ...defaults
  };
  for (const key of validProps) {
    let value = props[key];
    if (isConfigParam(value, key)) {
      if (key === 'simultaneousHandlers' || key === 'waitFor') {
        value = transformIntoHandlerTags(props[key]);
      } else if (key === 'hitSlop' && typeof value !== 'object') {
        value = {
          top: value,
          left: value,
          bottom: value,
          right: value
        };
      }
      filteredConfig[key] = value;
    }
  }
  return filteredConfig;
}
export function transformIntoHandlerTags(handlerIDs) {
  handlerIDs = toArray(handlerIDs);
  if (Platform.OS === 'web') {
    return handlerIDs.map(({
      current
    }) => current).filter(handle => handle);
  }
  // converts handler string IDs into their numeric tags
  return handlerIDs.map(handlerID => handlerIDToTag[handlerID] || handlerID.current?.handlerTag || -1).filter(handlerTag => handlerTag > 0);
}
export function findNodeHandle(node) {
  if (Platform.OS === 'web') {
    return node;
  }
  return findNodeHandleRN(node) ?? null;
}
let scheduledOperations = [];
let flushOperationsScheduled = false;
export function scheduleFlushOperations() {
  if (!flushOperationsScheduled) {
    flushOperationsScheduled = true;
    ghQueueMicrotask(() => {
      for (const operation of scheduledOperations) {
        operation();
      }
      scheduledOperations = [];
      RNGestureHandlerModule.flushOperations();
      flushOperationsScheduled = false;
    });
  }
}
export function scheduleOperationToBeFlushed(operation) {
  scheduledOperations.push(operation);
  scheduleFlushOperations();
}
//# sourceMappingURL=utils.js.map