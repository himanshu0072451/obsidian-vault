"use strict";

// Native event has to stay for v2 compatibility

export let EventTypes = /*#__PURE__*/function (EventTypes) {
  EventTypes[EventTypes["DOWN"] = 0] = "DOWN";
  EventTypes[EventTypes["ADDITIONAL_POINTER_DOWN"] = 1] = "ADDITIONAL_POINTER_DOWN";
  EventTypes[EventTypes["UP"] = 2] = "UP";
  EventTypes[EventTypes["ADDITIONAL_POINTER_UP"] = 3] = "ADDITIONAL_POINTER_UP";
  EventTypes[EventTypes["MOVE"] = 4] = "MOVE";
  EventTypes[EventTypes["ENTER"] = 5] = "ENTER";
  EventTypes[EventTypes["LEAVE"] = 6] = "LEAVE";
  EventTypes[EventTypes["CANCEL"] = 7] = "CANCEL";
  return EventTypes;
}({});
export let WheelDevice = /*#__PURE__*/function (WheelDevice) {
  WheelDevice[WheelDevice["UNDETERMINED"] = 0] = "UNDETERMINED";
  WheelDevice[WheelDevice["MOUSE"] = 1] = "MOUSE";
  WheelDevice[WheelDevice["TOUCHPAD"] = 2] = "TOUCHPAD";
  return WheelDevice;
}({});
export let NativeGestureRole = /*#__PURE__*/function (NativeGestureRole) {
  NativeGestureRole["Button"] = "GestureHandlerButton";
  NativeGestureRole["Switch"] = "Switch";
  NativeGestureRole["ScrollView"] = "ScrollView";
  return NativeGestureRole;
}({});
//# sourceMappingURL=interfaces.js.map