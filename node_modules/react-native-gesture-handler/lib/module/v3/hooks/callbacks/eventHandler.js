"use strict";

import { CALLBACK_TYPE } from '../../../handlers/gestures/gesture';
import { State } from '../../../State';
import { TouchEventType } from '../../../TouchEventType';
import { tagMessage } from '../../../utils';
import { flattenAndFilterEvent, isEventForHandlerWithTag, maybeExtractNativeEvent, runCallback, touchEventTypeToCallbackType } from '../utils';
import { isStateChangeEvent, isTouchEvent } from '../utils/eventUtils';
function handleStateChangeEvent(eventWithData, callbacks, context, fillInDefaultValues) {
  'worklet';

  const {
    oldState,
    state
  } = eventWithData;
  const event = flattenAndFilterEvent(eventWithData);
  if (oldState === State.UNDETERMINED && state === State.BEGAN) {
    runCallback(CALLBACK_TYPE.BEGAN, callbacks, event);
  } else if ((oldState === State.BEGAN || oldState === State.UNDETERMINED) && state === State.ACTIVE) {
    fillInDefaultValues?.(event);
    runCallback(CALLBACK_TYPE.START, callbacks, event);
  } else if (oldState !== state && (state === State.END || state === State.FAILED || state === State.CANCELLED)) {
    const canceled = state === State.FAILED || state === State.CANCELLED;
    const endEvent = {
      ...event,
      canceled
    };
    if (oldState === State.ACTIVE) {
      fillInDefaultValues?.(endEvent);
      runCallback(CALLBACK_TYPE.END, callbacks, endEvent);
    }
    runCallback(CALLBACK_TYPE.FINALIZE, callbacks, endEvent);
    if (context) {
      context.lastUpdateEvent = undefined;
    }
  }
}
export function handleUpdateEvent(eventWithData, handlers, changeEventCalculator, context) {
  'worklet';

  const eventWithChanges = changeEventCalculator ? changeEventCalculator(eventWithData, context ? context.lastUpdateEvent : undefined) : eventWithData;
  const event = flattenAndFilterEvent(eventWithChanges);

  // This should never happen, but since we don't want to call hooks conditionally, we have to mark
  // context as possibly undefined to make TypeScript happy.
  if (!context) {
    throw new Error(tagMessage('Event handler context is not defined'));
  }
  runCallback(CALLBACK_TYPE.UPDATE, handlers, event);
  context.lastUpdateEvent = eventWithData;
}
export function handleTouchEvent(event, handlers) {
  'worklet';

  if (event.eventType !== TouchEventType.UNDETERMINED) {
    runCallback(touchEventTypeToCallbackType(event.eventType), handlers, event);
  }
}
export function eventHandler(handlerTag, sourceEvent, handlers, changeEventCalculator, jsContext, dispatchesAnimatedEvents, fillInDefaultValues) {
  'worklet';

  const eventWithData = maybeExtractNativeEvent(sourceEvent);
  if (!isEventForHandlerWithTag(handlerTag, eventWithData)) {
    return;
  }
  if (isStateChangeEvent(eventWithData)) {
    handleStateChangeEvent(eventWithData, handlers, jsContext, fillInDefaultValues);
    return;
  }
  if (isTouchEvent(eventWithData)) {
    handleTouchEvent(eventWithData, handlers);
    return;
  }
  if (!dispatchesAnimatedEvents) {
    handleUpdateEvent(eventWithData, handlers, changeEventCalculator, jsContext);
  }
}
//# sourceMappingURL=eventHandler.js.map