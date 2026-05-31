"use strict";

import * as React from 'react';
import { FlatList as RNFlatList, ScrollView as RNScrollView, Switch as RNSwitch, TextInput as RNTextInput, View } from 'react-native';
import createNativeWrapper from '../handlers/createNativeWrapper';

/**
 * @deprecated use `ScrollView` instead
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const LegacyScrollView = createNativeWrapper(RNScrollView, {
  disallowInterruption: false
});

/**
 * @deprecated use `Switch` instead
 */
export const LegacySwitch = createNativeWrapper(RNSwitch, {
  shouldCancelWhenOutside: false,
  shouldActivateOnStart: true,
  disallowInterruption: true
});

/**
 * @deprecated use `TextInput` instead
 */
export const LegacyTextInput = createNativeWrapper(RNTextInput);

/**
 * @deprecated use `DrawerLayoutAndroid` instead
 */
export const LegacyDrawerLayoutAndroid = () => {
  console.warn('DrawerLayoutAndroid is not supported on web!');
  return /*#__PURE__*/_jsx(View, {});
};

/**
 * @deprecated use `RefreshControl` instead
 */
// RefreshControl is implemented as a functional component, rendering a View
// NativeViewGestureHandler needs to set a ref on its child, which cannot be done
// on functional components
export const LegacyRefreshControl = createNativeWrapper(View);

/**
 * @deprecated use `FlatList` instead
 */
export const LegacyFlatList = props => /*#__PURE__*/_jsx(RNFlatList, {
  ...props,
  renderScrollComponent: scrollProps => /*#__PURE__*/_jsx(LegacyScrollView, {
    ...scrollProps
  })
});
//# sourceMappingURL=GestureComponents.web.js.map