"use strict";

import { BaseGesture } from '../../handlers/gestures/gesture';
import { ComposedGesture } from '../../handlers/gestures/gestureComposition';
import { GestureDetector as LegacyGestureDetector } from '../../handlers/gestures/GestureDetector';
import { NativeDetector } from './NativeDetector';
import { useEnsureGestureHandlerRootView } from './useEnsureGestureHandlerRootView';
import { jsx as _jsx } from "react/jsx-runtime";
export function GestureDetector(props) {
  useEnsureGestureHandlerRootView();
  if (props.gesture instanceof ComposedGesture || props.gesture instanceof BaseGesture) {
    return /*#__PURE__*/_jsx(LegacyGestureDetector, {
      ...props
    });
  }
  return /*#__PURE__*/_jsx(NativeDetector, {
    ...props
  });
}
//# sourceMappingURL=GestureDetector.js.map