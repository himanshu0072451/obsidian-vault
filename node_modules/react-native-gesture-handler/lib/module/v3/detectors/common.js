"use strict";

import { Animated, StyleSheet } from 'react-native';
import HostGestureDetector from './HostGestureDetector';
export let GestureDetectorType = /*#__PURE__*/function (GestureDetectorType) {
  GestureDetectorType[GestureDetectorType["Native"] = 0] = "Native";
  GestureDetectorType[GestureDetectorType["Virtual"] = 1] = "Virtual";
  GestureDetectorType[GestureDetectorType["Intercepting"] = 2] = "Intercepting";
  return GestureDetectorType;
}({});
export const AnimatedNativeDetector = Animated.createAnimatedComponent(HostGestureDetector);
export const nativeDetectorStyles = StyleSheet.create({
  detector: {
    display: 'contents'
  }
});
//# sourceMappingURL=common.js.map