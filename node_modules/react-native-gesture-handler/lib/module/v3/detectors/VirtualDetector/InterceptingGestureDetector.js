"use strict";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Reanimated } from '../../../handlers/gestures/reanimatedWrapper';
import { tagMessage } from '../../../utils';
import { isComposedGesture } from '../../hooks/utils/relationUtils';
import { AnimatedNativeDetector, nativeDetectorStyles } from '../common';
import HostGestureDetector from '../HostGestureDetector';
import { ReanimatedNativeDetector } from '../ReanimatedNativeDetector';
import { useEnsureGestureHandlerRootView } from '../useEnsureGestureHandlerRootView';
import { useGestureRelationsUpdater } from '../useGestureRelationsUpdater';
import { ensureNativeDetectorComponent } from '../utils';
import { InterceptingDetectorContext, InterceptingDetectorMode } from './useInterceptingDetectorContext';
import { jsx as _jsx } from "react/jsx-runtime";
export function InterceptingGestureDetector({
  gesture,
  children,
  touchAction,
  userSelect,
  enableContextMenu
}) {
  useEnsureGestureHandlerRootView();
  const [virtualChildren, setVirtualChildren] = useState(() => new Set());
  const strippedVirtualChildren = useMemo(() => Platform.OS === 'web' ? Array.from(virtualChildren).map(child => ({
    viewTag: child.viewTag,
    handlerTags: child.handlerTags,
    viewRef: child.viewRef,
    userSelect: child.userSelect,
    touchAction: child.touchAction,
    enableContextMenu: child.enableContextMenu
  })) : Array.from(virtualChildren).map(child => ({
    viewTag: child.viewTag,
    handlerTags: child.handlerTags
  })), [virtualChildren]);
  const [mode, setMode] = useState(gesture?.config.shouldUseReanimatedDetector ? InterceptingDetectorMode.REANIMATED : gesture?.config.dispatchesAnimatedEvents ? InterceptingDetectorMode.ANIMATED : InterceptingDetectorMode.DEFAULT);
  const shouldUseReanimatedDetector = mode === InterceptingDetectorMode.REANIMATED;
  const dispatchesAnimatedEvents = mode === InterceptingDetectorMode.ANIMATED;
  const NativeDetectorComponent = dispatchesAnimatedEvents ? AnimatedNativeDetector : shouldUseReanimatedDetector ? ReanimatedNativeDetector : HostGestureDetector;
  const register = useCallback(child => {
    setVirtualChildren(prev => {
      const newSet = new Set(prev);
      newSet.add(child);
      return newSet;
    });
  }, []);
  const unregister = useCallback(child => {
    setVirtualChildren(prev => {
      const newSet = new Set(prev);
      newSet.delete(child);
      return newSet;
    });
  }, []);
  const contextValue = useMemo(() => ({
    mode,
    setMode: newMode => {
      if (newMode === InterceptingDetectorMode.REANIMATED && mode === InterceptingDetectorMode.ANIMATED || newMode === InterceptingDetectorMode.ANIMATED && mode === InterceptingDetectorMode.REANIMATED) {
        throw new Error(tagMessage('InterceptingGestureDetector can only handle either Reanimated or Animated events.'));
      }
      setMode(newMode);
    },
    register,
    unregister
  }), [mode, register, unregister]);
  useEffect(() => {
    if (gesture?.config?.dispatchesAnimatedEvents) {
      contextValue.setMode(InterceptingDetectorMode.ANIMATED);
    } else if (gesture?.config?.shouldUseReanimatedDetector) {
      contextValue.setMode(InterceptingDetectorMode.REANIMATED);
    }
  }, [contextValue, gesture?.config?.dispatchesAnimatedEvents, gesture?.config?.shouldUseReanimatedDetector]);

  // It might happen only with ReanimatedNativeDetector
  if (!NativeDetectorComponent) {
    throw new Error(tagMessage('Gesture expects to run on the UI thread, but failed to create the Reanimated NativeDetector.'));
  }
  const createGestureEventHandler = useCallback(key => {
    return e => {
      if (typeof gesture?.detectorCallbacks[key] === 'function') {
        // @ts-expect-error passing event to a union of functions where only one is typed as such
        gesture.detectorCallbacks[key](e);
      }
      virtualChildren.forEach(child => {
        const method = child.methods[key];
        if (typeof method === 'function') {
          // @ts-expect-error passing event to a union of functions where only one is typed as such
          method(e);
        }
      });
    };
  }, [gesture, virtualChildren]);
  const getHandlers = useCallback(key => {
    const handlers = [];
    if (gesture?.detectorCallbacks[key]) {
      handlers.push(gesture.detectorCallbacks[key]);
    }
    virtualChildren.forEach(child => {
      const handler = child.methods[key];
      if (handler) {
        handlers.push(handler);
      }
    });
    return handlers;
  }, [virtualChildren, gesture?.detectorCallbacks]);
  const reanimatedEvents = useMemo(() => getHandlers('reanimatedEventHandler'), [getHandlers]);
  const reanimatedEventHandler = Reanimated?.useComposedEventHandler(reanimatedEvents);
  ensureNativeDetectorComponent(NativeDetectorComponent);
  useGestureRelationsUpdater(gesture);
  const handlerTags = useMemo(() => {
    if (gesture) {
      return isComposedGesture(gesture) ? gesture.handlerTags : [gesture.handlerTag];
    }
    return [];
  }, [gesture]);

  // On web, we're triggering Reanimated callbacks ourselves, based on the type.
  // To handle this properly, we need to provide all three callbacks, so we set
  // all three to the Reanimated event handler.
  // On native, Reanimated handles routing internally based on the event names
  // passed to the useEvent hook. We only need to pass it once, so that Reanimated
  // can setup its internal listeners.
  const reanimatedHandlers = Platform.OS === 'web' ? {
    onGestureHandlerReanimatedEvent: reanimatedEventHandler,
    onGestureHandlerReanimatedStateChange: reanimatedEventHandler,
    onGestureHandlerReanimatedTouchEvent: reanimatedEventHandler
  } : {
    onGestureHandlerReanimatedEvent: reanimatedEventHandler
  };
  const jsEventHandler = useMemo(() => createGestureEventHandler('jsEventHandler'), [createGestureEventHandler]);
  return /*#__PURE__*/_jsx(InterceptingDetectorContext, {
    value: contextValue,
    children: /*#__PURE__*/_jsx(NativeDetectorComponent, {
      touchAction: touchAction,
      userSelect: userSelect,
      enableContextMenu: enableContextMenu,
      pointerEvents: 'box-none'
      // @ts-ignore This is a type mismatch between RNGH types and RN Codegen types
      ,
      onGestureHandlerStateChange: jsEventHandler
      // @ts-ignore This is a type mismatch between RNGH types and RN Codegen types
      ,
      onGestureHandlerEvent: jsEventHandler
      // @ts-ignore This is a type mismatch between RNGH types and RN Codegen types
      ,
      onGestureHandlerTouchEvent: jsEventHandler
      // @ts-ignore This is a type mismatch between RNGH types and RN Codegen types
      ,
      onGestureHandlerAnimatedEvent: gesture?.detectorCallbacks.animatedEventHandler
      // @ts-ignore This is a type mismatch between RNGH types and RN Codegen types
      ,
      onGestureHandlerReanimatedStateChange: shouldUseReanimatedDetector ? reanimatedHandlers.onGestureHandlerReanimatedStateChange : undefined
      // @ts-ignore This is a type mismatch between RNGH types and RN Codegen types
      ,
      onGestureHandlerReanimatedEvent: shouldUseReanimatedDetector ? reanimatedHandlers.onGestureHandlerReanimatedEvent : undefined
      // @ts-ignore This is a type mismatch between RNGH types and RN Codegen types
      ,
      onGestureHandlerReanimatedTouchEvent: shouldUseReanimatedDetector ? reanimatedHandlers.onGestureHandlerReanimatedTouchEvent : undefined,
      handlerTags: handlerTags,
      style: nativeDetectorStyles.detector,
      virtualChildren: strippedVirtualChildren,
      moduleId: globalThis._RNGH_MODULE_ID,
      children: children
    })
  });
}
//# sourceMappingURL=InterceptingGestureDetector.js.map