import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double, Int32, UnsafeMixed, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
type GestureHandlerEvent = Readonly<{
    handlerTag: Int32;
    state: Int32;
    handlerData: UnsafeMixed;
}>;
type GestureHandlerStateChangeEvent = Readonly<{
    handlerTag: Int32;
    state: Int32;
    oldState: Int32;
    handlerData: UnsafeMixed;
}>;
type GestureHandlerTouchEvent = Readonly<{
    handlerTag: Int32;
    numberOfTouches: Int32;
    state: Int32;
    eventType: Int32;
    allTouches: {
        id: Int32;
        x: Double;
        y: Double;
        absoluteX: Double;
        absoluteY: Double;
    }[];
    changedTouches: {
        id: Int32;
        x: Double;
        y: Double;
        absoluteX: Double;
        absoluteY: Double;
    }[];
    pointerType: Int32;
}>;
export interface VirtualChildrenProps {
    handlerTags: Int32[];
    viewTag: Int32;
}
export interface NativeProps extends ViewProps {
    onGestureHandlerEvent?: DirectEventHandler<GestureHandlerEvent> | undefined;
    onGestureHandlerStateChange?: DirectEventHandler<GestureHandlerStateChangeEvent> | undefined;
    onGestureHandlerTouchEvent?: DirectEventHandler<GestureHandlerTouchEvent> | undefined;
    onGestureHandlerReanimatedEvent?: DirectEventHandler<GestureHandlerEvent> | undefined;
    onGestureHandlerReanimatedStateChange?: DirectEventHandler<GestureHandlerStateChangeEvent> | undefined;
    onGestureHandlerReanimatedTouchEvent?: DirectEventHandler<GestureHandlerTouchEvent> | undefined;
    onGestureHandlerAnimatedEvent?: DirectEventHandler<GestureHandlerEvent> | undefined;
    handlerTags: Int32[];
    moduleId: Int32;
    virtualChildren: VirtualChildrenProps[];
    pointerEvents?: WithDefault<'box-none' | 'none' | 'box-only' | 'auto', 'auto'>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=RNGestureHandlerDetectorNativeComponent.d.ts.map