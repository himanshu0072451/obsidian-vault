"use strict";

import { Platform } from 'react-native';
import { ActionType } from '../../../ActionType';
import { ghQueueMicrotask } from '../../../ghQueueMicrotask';
import { MountRegistry } from '../../../mountRegistry';
import RNGestureHandlerModule from '../../../RNGestureHandlerModule';
import { registerHandler } from '../../handlersRegistry';
import { filterConfig, scheduleFlushOperations } from '../../utils';
import { ALLOWED_PROPS, checkGestureCallbacksForWorklets, extractGestureRelations } from './utils';
export function attachHandlers({
  preparedGesture,
  gestureConfig,
  gesturesToAttach,
  viewTag,
  webEventHandlersRef
}) {
  gestureConfig.initialize();

  // Use queueMicrotask to extract handlerTags, because all refs should be initialized
  // when it's ran
  ghQueueMicrotask(() => {
    if (!preparedGesture.isMounted) {
      return;
    }
    gestureConfig.prepare();
  });
  for (const handler of gesturesToAttach) {
    checkGestureCallbacksForWorklets(handler);
    RNGestureHandlerModule.createGestureHandler(handler.handlerName, handler.handlerTag, filterConfig(handler.config, ALLOWED_PROPS));
    registerHandler(handler.handlerTag, handler, handler.config.testId);
  }

  // Use queueMicrotask to extract handlerTags, because all refs should be initialized
  // when it's ran
  ghQueueMicrotask(() => {
    if (!preparedGesture.isMounted) {
      return;
    }
    for (const handler of gesturesToAttach) {
      RNGestureHandlerModule.setGestureHandlerConfig(handler.handlerTag, filterConfig(handler.config, ALLOWED_PROPS));
      RNGestureHandlerModule.configureRelations(handler.handlerTag, extractGestureRelations(handler));
    }
    scheduleFlushOperations();
  });
  for (const gesture of gesturesToAttach) {
    const actionType = gesture.shouldUseReanimated ? ActionType.REANIMATED_WORKLET : ActionType.JS_FUNCTION_NEW_API;
    if (Platform.OS === 'web') {
      RNGestureHandlerModule.attachGestureHandler(gesture.handlerTag, viewTag, ActionType.JS_FUNCTION_OLD_API,
      // Ignored on web
      webEventHandlersRef);
    } else {
      RNGestureHandlerModule.attachGestureHandler(gesture.handlerTag, viewTag, actionType);
    }
    MountRegistry.gestureWillMount(gesture);
  }
  preparedGesture.attachedGestures = gesturesToAttach;
  if (preparedGesture.animatedHandlers) {
    const isAnimatedGesture = g => g.shouldUseReanimated;
    preparedGesture.animatedHandlers.value = gesturesToAttach.filter(isAnimatedGesture).map(g => g.handlers);
  }
}
//# sourceMappingURL=attachHandlers.js.map