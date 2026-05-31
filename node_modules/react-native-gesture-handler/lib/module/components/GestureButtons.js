"use strict";

import * as React from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import createNativeWrapper from '../handlers/createNativeWrapper';
import { State } from '../State';
import GestureHandlerButton from './GestureHandlerButton';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LegacyRawButtonInner = createNativeWrapper(GestureHandlerButton, {
  shouldCancelWhenOutside: false,
  shouldActivateOnStart: Platform.OS === 'web'
});

/**
 * @deprecated use `RawButton` instead
 */
export const LegacyRawButton = props => /*#__PURE__*/_jsx(LegacyRawButtonInner, {
  ...props,
  needsOffscreenAlphaCompositing: true
});
class InnerBaseButton extends React.Component {
  static defaultProps = {
    delayLongPress: 600
  };
  constructor(props) {
    super(props);
    this.lastIsPressed = false;
    this.longPressDetected = false;
  }
  handleEvent = ({
    nativeEvent
  }) => {
    const {
      state,
      oldState,
      pointerInside
    } = nativeEvent;
    const isPressed = pointerInside && (state === State.BEGAN || state === State.ACTIVE);
    if (isPressed !== this.lastIsPressed && this.props.onActiveStateChange) {
      this.props.onActiveStateChange(isPressed);
    }
    if (!this.longPressDetected && oldState === State.ACTIVE && state !== State.CANCELLED && this.lastIsPressed && this.props.onPress) {
      this.props.onPress(pointerInside);
    }
    if (!this.lastIsPressed && state === State.BEGAN && pointerInside) {
      this.longPressDetected = false;
      if (this.props.onLongPress) {
        this.longPressTimeout = setTimeout(this.onLongPress, this.props.delayLongPress);
      }
    } else if (
    // Cancel longpress timeout if it's set and the finger moved out of the view
    state === State.ACTIVE && !pointerInside && this.longPressTimeout !== undefined) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = undefined;
    } else if (
    // Cancel longpress timeout if it's set and the gesture has finished
    this.longPressTimeout !== undefined && (state === State.END || state === State.CANCELLED || state === State.FAILED)) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = undefined;
    }
    this.lastIsPressed = isPressed;
  };
  onLongPress = () => {
    this.longPressDetected = true;
    this.props.onLongPress?.();
  };

  // Normally, the parent would execute it's handler first, then forward the
  // event to listeners. However, here our handler is virtually only forwarding
  // events to listeners, so we reverse the order to keep the proper order of
  // the callbacks (from "raw" ones to "processed").
  onHandlerStateChange = e => {
    this.props.onHandlerStateChange?.(e);
    this.handleEvent(e);
  };
  onGestureEvent = e => {
    this.props.onGestureEvent?.(e);
    this.handleEvent(e); // TODO: maybe it is not correct
  };
  render() {
    const {
      rippleColor,
      style,
      ...rest
    } = this.props;
    return /*#__PURE__*/_jsx(LegacyRawButton, {
      ref: this.props.innerRef,
      rippleColor: rippleColor,
      style: [style, Platform.OS === 'ios' && {
        cursor: undefined
      }],
      ...rest,
      onGestureEvent: this.onGestureEvent,
      onHandlerStateChange: this.onHandlerStateChange
    });
  }
}
const AnimatedInnerBaseButton = Animated.createAnimatedComponent(InnerBaseButton);

/**
 * @deprecated use `BaseButton` instead
 */
export const LegacyBaseButton = ({
  ref,
  ...props
}) => /*#__PURE__*/_jsx(InnerBaseButton, {
  innerRef: ref,
  ...props
});
const AnimatedBaseButton = ({
  ref,
  ...props
}) => /*#__PURE__*/_jsx(AnimatedInnerBaseButton, {
  innerRef: ref,
  ...props
});
const btnStyles = StyleSheet.create({
  underlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0
  }
});
class InnerRectButton extends React.Component {
  static defaultProps = {
    activeOpacity: 0.105,
    underlayColor: 'black'
  };
  constructor(props) {
    super(props);
    this.opacity = new Animated.Value(0);
  }
  onActiveStateChange = active => {
    if (Platform.OS !== 'android') {
      this.opacity.setValue(active ? this.props.activeOpacity : 0);
    }
    this.props.onActiveStateChange?.(active);
  };
  render() {
    // Move activeOpacity out of the rest props to avoid passing it to the native component
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      children,
      style,
      activeOpacity,
      ...rest
    } = this.props;
    const resolvedStyle = StyleSheet.flatten(style) ?? {};
    return /*#__PURE__*/_jsxs(LegacyBaseButton, {
      ...rest,
      ref: this.props.innerRef,
      style: resolvedStyle,
      onActiveStateChange: this.onActiveStateChange,
      children: [/*#__PURE__*/_jsx(Animated.View, {
        style: [btnStyles.underlay, {
          opacity: this.opacity,
          backgroundColor: this.props.underlayColor,
          borderRadius: resolvedStyle.borderRadius,
          borderTopLeftRadius: resolvedStyle.borderTopLeftRadius,
          borderTopRightRadius: resolvedStyle.borderTopRightRadius,
          borderBottomLeftRadius: resolvedStyle.borderBottomLeftRadius,
          borderBottomRightRadius: resolvedStyle.borderBottomRightRadius
        }]
      }), children]
    });
  }
}

/**
 * @deprecated use `RectButton` instead
 */
export const LegacyRectButton = ({
  ref,
  ...props
}) => /*#__PURE__*/_jsx(InnerRectButton, {
  innerRef: ref,
  ...props
});
class InnerBorderlessButton extends React.Component {
  static defaultProps = {
    activeOpacity: 0.3,
    borderless: true
  };
  constructor(props) {
    super(props);
    this.opacity = new Animated.Value(1);
  }
  onActiveStateChange = active => {
    if (Platform.OS !== 'android') {
      this.opacity.setValue(active ? this.props.activeOpacity : 1);
    }
    this.props.onActiveStateChange?.(active);
  };
  render() {
    // Move activeOpacity out of the rest props to avoid passing it to the native component
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      children,
      style,
      innerRef,
      activeOpacity,
      ...rest
    } = this.props;
    return /*#__PURE__*/_jsx(AnimatedBaseButton, {
      ...rest,
      innerRef: innerRef,
      onActiveStateChange: this.onActiveStateChange,
      style: [style, Platform.OS === 'ios' && {
        opacity: this.opacity
      }],
      children: children
    });
  }
}

/**
 * @deprecated use `BorderlessButton` instead
 */
export const LegacyBorderlessButton = ({
  ref,
  ...props
}) => /*#__PURE__*/_jsx(InnerBorderlessButton, {
  innerRef: ref,
  ...props
});

/**
 * @deprecated use `PureNativeButton` instead
 */
export const LegacyPureNativeButton = props => /*#__PURE__*/_jsx(GestureHandlerButton, {
  ...props,
  needsOffscreenAlphaCompositing: true
});
//# sourceMappingURL=GestureButtons.js.map