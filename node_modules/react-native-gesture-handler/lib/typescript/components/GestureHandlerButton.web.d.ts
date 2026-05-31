import * as React from 'react';
import type { ColorValue, ViewProps } from 'react-native';
import { View } from 'react-native';
import { NativeGestureRole } from '../web/interfaces';
type ButtonProps = ViewProps & {
    ref?: React.Ref<React.ComponentRef<typeof View>>;
    enabled?: boolean;
    tapAnimationInDuration?: number;
    tapAnimationOutDuration?: number;
    longPressDuration?: number;
    longPressAnimationOutDuration?: number;
    hoverAnimationInDuration?: number;
    hoverAnimationOutDuration?: number;
    activeOpacity?: number;
    activeScale?: number;
    activeUnderlayOpacity?: number;
    hoverOpacity?: number;
    hoverScale?: number;
    hoverUnderlayOpacity?: number;
    defaultOpacity?: number;
    defaultScale?: number;
    defaultUnderlayOpacity?: number;
    underlayColor?: ColorValue;
};
export declare const ButtonComponent: {
    ({ ref: externalRef, enabled, tapAnimationInDuration, tapAnimationOutDuration, longPressDuration, longPressAnimationOutDuration, hoverAnimationInDuration, hoverAnimationOutDuration, activeOpacity, activeScale, activeUnderlayOpacity, hoverOpacity: hoverOpacityProp, hoverScale: hoverScaleProp, hoverUnderlayOpacity: hoverUnderlayOpacityProp, defaultOpacity, defaultScale, defaultUnderlayOpacity, underlayColor, style, children, ...rest }: ButtonProps): React.JSX.Element;
    displayName: NativeGestureRole;
};
export default ButtonComponent;
//# sourceMappingURL=GestureHandlerButton.web.d.ts.map