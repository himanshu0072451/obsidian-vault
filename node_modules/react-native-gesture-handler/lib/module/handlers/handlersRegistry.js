"use strict";

import { isTestEnv } from '../utils';
export const handlerIDToTag = {};

// There were attempts to create types that merge possible HandlerData and Config,
// but ts was not able to infer them properly in many cases, so we use any here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hookGestures = new Map();
const gestures = new Map();
const oldHandlers = new Map();
const testIDs = new Map();
export function registerGesture(handlerTag, gesture) {
  if (isTestEnv() && gesture.config.testID) {
    hookGestures.set(handlerTag, gesture);
    testIDs.set(gesture.config.testID, handlerTag);
  }
}
export function unregisterGesture(handlerTag) {
  const gesture = hookGestures.get(handlerTag);
  if (gesture && isTestEnv() && gesture.config.testID) {
    testIDs.delete(gesture.config.testID);
    hookGestures.delete(handlerTag);
  }
}
export function registerHandler(handlerTag, handler, testID) {
  gestures.set(handlerTag, handler);
  if (isTestEnv() && testID) {
    testIDs.set(testID, handlerTag);
  }
}
export function registerOldGestureHandler(handlerTag, handler) {
  oldHandlers.set(handlerTag, handler);
}
export function unregisterOldGestureHandler(handlerTag) {
  oldHandlers.delete(handlerTag);
}
export function unregisterHandler(handlerTag, testID) {
  gestures.delete(handlerTag);
  if (isTestEnv() && testID) {
    testIDs.delete(testID);
  }
}
export function findHandler(handlerTag) {
  return gestures.get(handlerTag);
}
export function findGesture(handlerTag) {
  return hookGestures.get(handlerTag);
}
export function findOldGestureHandler(handlerTag) {
  return oldHandlers.get(handlerTag);
}
export function findHandlerByTestID(testID) {
  const handlerTag = testIDs.get(testID);
  if (handlerTag !== undefined) {
    return findHandler(handlerTag) ?? findGesture(handlerTag) ?? null;
  }
  return null;
}
//# sourceMappingURL=handlersRegistry.js.map