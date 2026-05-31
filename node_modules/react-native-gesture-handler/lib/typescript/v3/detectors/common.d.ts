import type React from 'react';
import { Animated } from 'react-native';
import type { TouchAction, UserSelect } from '../../handlers/gestureHandlerCommon';
import type { GestureDetectorProps as LegacyDetectorProps } from '../../handlers/gestures/GestureDetector';
import type { Gesture } from '../types';
export declare enum GestureDetectorType {
    Native = 0,
    Virtual = 1,
    Intercepting = 2
}
interface CommonGestureDetectorProps {
    children?: React.ReactNode;
    userSelect?: UserSelect | undefined;
    touchAction?: TouchAction | undefined;
    enableContextMenu?: boolean | undefined;
}
export interface NativeDetectorProps<TConfig, THandlerData, TExtendedHandlerData extends THandlerData> extends CommonGestureDetectorProps {
    gesture: Gesture<TConfig, THandlerData, TExtendedHandlerData>;
}
export interface InterceptingGestureDetectorProps<TConfig, THandlerData, TExtendedHandlerData extends THandlerData> extends CommonGestureDetectorProps {
    gesture?: Gesture<TConfig, THandlerData, TExtendedHandlerData>;
}
export interface VirtualDetectorProps<TConfig, THandlerData, TExtendedHandlerData extends THandlerData> extends CommonGestureDetectorProps {
    gesture: Gesture<TConfig, THandlerData, TExtendedHandlerData>;
}
export type GestureDetectorProps<TConfig, THandlerData, TExtendedHandlerData extends THandlerData> = NativeDetectorProps<TConfig, THandlerData, TExtendedHandlerData> | InterceptingGestureDetectorProps<TConfig, THandlerData, TExtendedHandlerData> | LegacyDetectorProps;
export declare const AnimatedNativeDetector: Animated.AnimatedComponent<import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<import("./HostGestureDetector").RNGestureHandlerDetectorNativeComponentProps>>;
export declare const nativeDetectorStyles: {
    detector: {
        display: "contents";
    };
};
export {};
//# sourceMappingURL=common.d.ts.map