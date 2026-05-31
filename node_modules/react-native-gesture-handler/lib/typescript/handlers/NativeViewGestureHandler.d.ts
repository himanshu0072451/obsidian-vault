import type { BaseGestureHandlerProps } from './gestureHandlerCommon';
import type { NativeViewGestureHandlerPayload } from './GestureHandlerEventPayload';
export declare const nativeViewGestureHandlerProps: readonly ["shouldActivateOnStart", "disallowInterruption"];
export interface NativeViewGestureConfig {
    /**
     * Android only.
     *
     * Determines whether the handler should check for an existing touch event on
     * instantiation.
     */
    shouldActivateOnStart?: boolean | undefined;
    /**
     * When `true`, cancels all other gesture handlers when this
     * `NativeViewGestureHandler` receives an `ACTIVE` state event.
     */
    disallowInterruption?: boolean | undefined;
}
/**
 * @deprecated NativeViewGestureHandler will be removed in the future version of Gesture Handler. Use `Gesture.Native()` instead.
 */
export interface NativeViewGestureHandlerProps extends BaseGestureHandlerProps<NativeViewGestureHandlerPayload>, NativeViewGestureConfig {
}
export declare const nativeViewProps: readonly ["id", "enabled", "shouldCancelWhenOutside", "hitSlop", "cancelsTouchesInView", "userSelect", "activeCursor", "mouseButton", "enableContextMenu", "touchAction", "waitFor", "simultaneousHandlers", "blocksHandlers", "onBegan", "onFailed", "onCancelled", "onActivated", "onEnded", "onGestureEvent", "onHandlerStateChange", "shouldActivateOnStart", "disallowInterruption"];
export declare const nativeViewHandlerName = "NativeViewGestureHandler";
/**
 * @deprecated NativeViewGestureHandler will be removed in the future version of Gesture Handler. Use `Gesture.Native()` instead.
 */
export type NativeViewGestureHandler = typeof NativeViewGestureHandler;
/**
 * @deprecated NativeViewGestureHandler will be removed in the future version of Gesture Handler. Use `Gesture.Native()` instead.
 */
export declare const NativeViewGestureHandler: import("react").ComponentType<NativeViewGestureHandlerProps & import("react").RefAttributes<any>>;
//# sourceMappingURL=NativeViewGestureHandler.d.ts.map