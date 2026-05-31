"use strict";

import React, { useState } from 'react';
import { FlatList as RNFlatList, RefreshControl as RNRefreshControl, ScrollView as RNScrollView, Switch as RNSwitch, TextInput as RNTextInput } from 'react-native';
import { ghQueueMicrotask } from '../../ghQueueMicrotask';
import createNativeWrapper from '../createNativeWrapper';
import { GestureDetectorType } from '../detectors';
import { NativeWrapperProps } from '../hooks/utils';
import { jsx as _jsx } from "react/jsx-runtime";
export const RefreshControl = createNativeWrapper(RNRefreshControl, {
  disallowInterruption: true,
  shouldCancelWhenOutside: false
}, GestureDetectorType.Virtual);

// eslint-disable-next-line @typescript-eslint/no-redeclare

const GHScrollView = createNativeWrapper(RNScrollView, {
  disallowInterruption: true,
  shouldCancelWhenOutside: false
}, GestureDetectorType.Intercepting);
export const ScrollView = props => {
  const {
    refreshControl,
    onGestureUpdate_CAN_CAUSE_INFINITE_RERENDER,
    ...rest
  } = props;
  const [scrollGesture, setScrollGesture] = useState(null);
  const updateGesture = gesture => {
    ghQueueMicrotask(() => {
      if (!scrollGesture || scrollGesture.handlerTag !== gesture.handlerTag) {
        setScrollGesture(gesture);
        onGestureUpdate_CAN_CAUSE_INFINITE_RERENDER?.(gesture);
      }
    });
  };
  return /*#__PURE__*/_jsx(GHScrollView, {
    ...rest,
    ref: props.ref,
    onGestureUpdate_CAN_CAUSE_INFINITE_RERENDER: updateGesture
    // @ts-ignore we don't pass `refreshing` prop as we only want to override the ref
    ,
    refreshControl: refreshControl ? /*#__PURE__*/React.cloneElement(refreshControl,
    // @ts-ignore block exists (on our RefreshControl)
    scrollGesture ? {
      block: scrollGesture
    } : {}) : undefined
  });
};

// eslint-disable-next-line @typescript-eslint/no-redeclare

export const Switch = createNativeWrapper(RNSwitch, {
  shouldCancelWhenOutside: false,
  shouldActivateOnStart: true,
  disallowInterruption: true
});

// eslint-disable-next-line @typescript-eslint/no-redeclare

export const TextInput = createNativeWrapper(RNTextInput);

// eslint-disable-next-line @typescript-eslint/no-redeclare

export const FlatList = props => {
  const {
    refreshControl,
    ref,
    onGestureUpdate_CAN_CAUSE_INFINITE_RERENDER,
    ...rest
  } = props;
  const [scrollGesture, setScrollGesture] = useState(null);
  const updateGesture = gesture => {
    ghQueueMicrotask(() => {
      if (!scrollGesture || scrollGesture.handlerTag !== gesture.handlerTag) {
        setScrollGesture(gesture);
        onGestureUpdate_CAN_CAUSE_INFINITE_RERENDER?.(gesture);
      }
    });
  };
  const flatListProps = {};
  const scrollViewProps = {};
  for (const [propName, value] of Object.entries(rest)) {
    // @ts-ignore https://github.com/microsoft/TypeScript/issues/26255
    if (NativeWrapperProps.has(propName)) {
      // @ts-ignore - this function cannot have generic type so we have to ignore this error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      scrollViewProps[propName] = value;
    } else {
      // @ts-ignore - this function cannot have generic type so we have to ignore this error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      flatListProps[propName] = value;
    }
  }
  return (
    /*#__PURE__*/
    // @ts-ignore - this function cannot have generic type so we have to ignore this error
    _jsx(RNFlatList, {
      ref: ref,
      ...flatListProps,
      renderScrollComponent: scrollProps => /*#__PURE__*/_jsx(ScrollView, {
        onGestureUpdate_CAN_CAUSE_INFINITE_RERENDER: updateGesture,
        ...scrollProps,
        ...scrollViewProps
      })
      // @ts-ignore we don't pass `refreshing` prop as we only want to override the ref
      ,
      refreshControl: refreshControl ? /*#__PURE__*/React.cloneElement(refreshControl,
      // @ts-ignore block exists (on our RefreshControl)
      scrollGesture ? {
        block: scrollGesture
      } : {}) : undefined
    })
  );
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
//# sourceMappingURL=GestureComponents.js.map