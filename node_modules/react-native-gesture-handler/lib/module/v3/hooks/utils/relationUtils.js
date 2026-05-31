"use strict";

export function isComposedGesture(gesture) {
  return 'handlerTags' in gesture;
}
function extractHandlerTags(otherHandler) {
  if (!otherHandler) {
    return [];
  }
  let otherTags;
  if (Array.isArray(otherHandler)) {
    otherTags = otherHandler.flatMap(gesture => isComposedGesture(gesture) ? gesture.handlerTags : [gesture.handlerTag]);
  } else {
    otherTags = isComposedGesture(otherHandler) ? otherHandler.handlerTags : [otherHandler.handlerTag];
  }
  return otherTags;
}
function makeSimultaneousWithSymmetric(otherHandler, handlerTag) {
  if (!otherHandler) {
    return;
  }
  const processSingleGesture = gesture => {
    const simultaneousHandlers = isComposedGesture(gesture) ? gesture.externalSimultaneousHandlers : gesture.gestureRelations.simultaneousHandlers;
    if (!simultaneousHandlers.includes(handlerTag)) {
      simultaneousHandlers.push(handlerTag);
    }
  };
  if (Array.isArray(otherHandler)) {
    otherHandler.forEach(processSingleGesture);
  } else {
    processSingleGesture(otherHandler);
  }
}
export function prepareRelations(relations, handlerTag) {
  makeSimultaneousWithSymmetric(relations.simultaneousWith, handlerTag);
  return {
    simultaneousHandlers: extractHandlerTags(relations.simultaneousWith),
    waitFor: extractHandlerTags(relations.requireToFail),
    blocksHandlers: extractHandlerTags(relations.block)
  };
}
export function containsDuplicates(tags) {
  return new Set(tags).size !== tags.length;
}
//# sourceMappingURL=relationUtils.js.map