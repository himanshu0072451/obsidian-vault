"use strict";

import React from 'react';
import { TouchableNativeFeedback, View } from 'react-native';
import { jsx as _jsx } from "react/jsx-runtime";
const RawButton = ({
  enabled,
  children,
  ...rest
}) => /*#__PURE__*/_jsx(TouchableNativeFeedback, {
  disabled: enabled === false,
  ...rest,
  children: children ?? /*#__PURE__*/_jsx(View, {})
});
export const LegacyRawButton = RawButton;
export const LegacyBaseButton = RawButton;
export const LegacyRectButton = RawButton;
export const LegacyBorderlessButton = RawButton;
export const LegacyPureNativeButton = RawButton;
//# sourceMappingURL=GestureButtons.js.map