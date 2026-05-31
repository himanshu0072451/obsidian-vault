"use strict";

// Unfortunately, this type cannot be moved into ConfigTypes.ts because of circular dependency

// Similarly, this type cannot be moved into ConfigTypes.ts because it depends on `ExternalRelations`

// eslint-disable-next-line @typescript-eslint/no-explicit-any

export let SingleGestureName = /*#__PURE__*/function (SingleGestureName) {
  SingleGestureName["Tap"] = "TapGestureHandler";
  SingleGestureName["LongPress"] = "LongPressGestureHandler";
  SingleGestureName["Pan"] = "PanGestureHandler";
  SingleGestureName["Pinch"] = "PinchGestureHandler";
  SingleGestureName["Rotation"] = "RotationGestureHandler";
  SingleGestureName["Fling"] = "FlingGestureHandler";
  SingleGestureName["Manual"] = "ManualGestureHandler";
  SingleGestureName["Native"] = "NativeViewGestureHandler";
  SingleGestureName["Hover"] = "HoverGestureHandler";
  return SingleGestureName;
}({});
export let ComposedGestureName = /*#__PURE__*/function (ComposedGestureName) {
  ComposedGestureName["Simultaneous"] = "SimultaneousGesture";
  ComposedGestureName["Exclusive"] = "ExclusiveGesture";
  ComposedGestureName["Race"] = "RaceGesture";
  return ComposedGestureName;
}({});
//# sourceMappingURL=GestureTypes.js.map