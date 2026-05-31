import type * as React from 'react';
import type { PointerType } from '../PointerType';
import type { State } from '../State';
import type { TouchEventType } from '../TouchEventType';
import type { ValueOf } from '../typeUtils';
export declare const baseGestureHandlerProps: readonly ["id", "enabled", "shouldCancelWhenOutside", "hitSlop", "cancelsTouchesInView", "userSelect", "activeCursor", "mouseButton", "enableContextMenu", "touchAction", "waitFor", "simultaneousHandlers", "blocksHandlers", "onBegan", "onFailed", "onCancelled", "onActivated", "onEnded", "onGestureEvent", "onHandlerStateChange"];
export declare const baseGestureHandlerWithDetectorProps: string[];
export interface GestureEventPayload {
    handlerTag: number;
    numberOfPointers: number;
    state: ValueOf<typeof State>;
    pointerType: PointerType;
}
export interface HandlerStateChangeEventPayload extends GestureEventPayload {
    oldState: ValueOf<typeof State>;
}
export type HitSlop = number | null | undefined | Partial<Record<'left' | 'right' | 'top' | 'bottom' | 'vertical' | 'horizontal', number | undefined>> | Record<'width' | 'left', number> | Record<'width' | 'right', number> | Record<'height' | 'top', number> | Record<'height' | 'bottom', number>;
export type UserSelect = 'none' | 'auto' | 'text';
export type ActiveCursor = 'auto' | 'default' | 'none' | 'context-menu' | 'help' | 'pointer' | 'progress' | 'wait' | 'cell' | 'crosshair' | 'text' | 'vertical-text' | 'alias' | 'copy' | 'move' | 'no-drop' | 'not-allowed' | 'grab' | 'grabbing' | 'e-resize' | 'n-resize' | 'ne-resize' | 'nw-resize' | 's-resize' | 'se-resize' | 'sw-resize' | 'w-resize' | 'ew-resize' | 'ns-resize' | 'nesw-resize' | 'nwse-resize' | 'col-resize' | 'row-resize' | 'all-scroll' | 'zoom-in' | 'zoom-out';
export declare enum MouseButton {
    LEFT = 1,
    RIGHT = 2,
    MIDDLE = 4,
    BUTTON_4 = 8,
    BUTTON_5 = 16,
    ALL = 31
}
export type TouchAction = 'auto' | 'none' | 'pan-x' | 'pan-left' | 'pan-right' | 'pan-y' | 'pan-up' | 'pan-down' | 'pinch-zoom' | 'manipulation' | 'inherit' | 'initial' | 'revert' | 'revert-layer' | 'unset';
export interface GestureEvent<ExtraEventPayloadT = Record<string, unknown>> {
    nativeEvent: Readonly<GestureEventPayload & ExtraEventPayloadT>;
}
export interface HandlerStateChangeEvent<ExtraEventPayloadT = Record<string, unknown>> {
    nativeEvent: Readonly<HandlerStateChangeEventPayload & ExtraEventPayloadT>;
}
export type TouchData = {
    id: number;
    x: number;
    y: number;
    absoluteX: number;
    absoluteY: number;
};
export type GestureTouchEvent = {
    handlerTag: number;
    numberOfTouches: number;
    state: ValueOf<typeof State>;
    eventType: TouchEventType;
    allTouches: TouchData[];
    changedTouches: TouchData[];
    pointerType: PointerType;
};
export interface StylusData {
    tiltX: number;
    tiltY: number;
    azimuthAngle: number;
    altitudeAngle: number;
    pressure: number;
}
export type GestureUpdateEvent<GestureEventPayloadT = Record<string, unknown>> = GestureEventPayload & GestureEventPayloadT;
export type GestureStateChangeEvent<GestureStateChangeEventPayloadT = Record<string, unknown>> = HandlerStateChangeEventPayload & GestureStateChangeEventPayloadT;
export type CommonGestureConfig = {
    enabled?: boolean | undefined;
    shouldCancelWhenOutside?: boolean | undefined;
    hitSlop?: HitSlop | undefined;
    userSelect?: UserSelect | undefined;
    activeCursor?: ActiveCursor | undefined;
    mouseButton?: MouseButton | undefined;
    enableContextMenu?: boolean | undefined;
    touchAction?: TouchAction | undefined;
};
export type BaseGestureHandlerProps<ExtraEventPayloadT extends Record<string, unknown> = Record<string, unknown>> = CommonGestureConfig & {
    id?: string | undefined;
    waitFor?: React.Ref<unknown> | React.Ref<unknown>[] | undefined;
    simultaneousHandlers?: React.Ref<unknown> | React.Ref<unknown>[] | undefined;
    blocksHandlers?: React.Ref<unknown> | React.Ref<unknown>[] | undefined;
    testID?: string | undefined;
    cancelsTouchesInView?: boolean | undefined;
    onBegan?: ((event: HandlerStateChangeEvent) => void) | undefined;
    onFailed?: ((event: HandlerStateChangeEvent) => void) | undefined;
    onCancelled?: ((event: HandlerStateChangeEvent) => void) | undefined;
    onActivated?: ((event: HandlerStateChangeEvent) => void) | undefined;
    onEnded?: ((event: HandlerStateChangeEvent) => void) | undefined;
    onGestureEvent?: ((event: GestureEvent<ExtraEventPayloadT>) => void) | undefined;
    onHandlerStateChange?: ((event: HandlerStateChangeEvent<ExtraEventPayloadT>) => void) | undefined;
    children?: React.ReactNode;
};
//# sourceMappingURL=gestureHandlerCommon.d.ts.map