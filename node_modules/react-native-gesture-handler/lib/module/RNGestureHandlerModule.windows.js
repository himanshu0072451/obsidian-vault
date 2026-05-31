"use strict";

import FlingGestureHandler from './web/handlers/FlingGestureHandler';
import LongPressGestureHandler from './web/handlers/LongPressGestureHandler';
import ManualGestureHandler from './web/handlers/ManualGestureHandler';
import NativeViewGestureHandler from './web/handlers/NativeViewGestureHandler';
import PanGestureHandler from './web/handlers/PanGestureHandler';
import PinchGestureHandler from './web/handlers/PinchGestureHandler';
import RotationGestureHandler from './web/handlers/RotationGestureHandler';
import TapGestureHandler from './web/handlers/TapGestureHandler';
export const Gestures = {
  NativeViewGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  FlingGestureHandler,
  ManualGestureHandler
};
export default {
  createGestureHandler(_handlerName, _handlerTag, _config) {
    // NO-OP
  },
  attachGestureHandler(_handlerTag,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _newView, _actionType, _propsRef) {
    // NO-OP
  },
  setGestureHandlerConfig(_handlerTag, _newConfig) {
    // NO-OP
  },
  updateGestureHandlerConfig(_handlerTag, _newConfig) {
    // NO-OP
  },
  getGestureHandlerNode(_handlerTag) {
    // NO-OP
  },
  dropGestureHandler(_handlerTag) {
    // NO-OP
  },
  flushOperations() {
    // NO-OP
  }
};
//# sourceMappingURL=RNGestureHandlerModule.windows.js.map