import * as React from 'react';
import type { FlatListProps } from 'react-native';
export declare const ScrollView: {
    (props: import("react-native").ScrollViewProps & {
        disableReanimated?: boolean | undefined;
        useAnimated?: boolean | undefined;
        testID?: string | undefined;
    } & {
        runOnJS?: boolean | import("../types").SharedValue<boolean> | undefined;
        enabled?: boolean | import("../types").SharedValue<boolean> | undefined;
        shouldCancelWhenOutside?: boolean | import("../types").SharedValue<boolean> | undefined;
        hitSlop?: number | import("../types").SharedValue<number> | import("../types").SharedValue<null> | {
            left?: number | import("../types").SharedValue<number> | undefined;
            right?: number | import("../types").SharedValue<number> | undefined;
            top?: number | import("../types").SharedValue<number> | undefined;
            bottom?: number | import("../types").SharedValue<number> | undefined;
            vertical?: number | import("../types").SharedValue<number> | undefined;
            horizontal?: number | import("../types").SharedValue<number> | undefined;
        } | {
            left: number | import("../types").SharedValue<number>;
            width: number | import("../types").SharedValue<number>;
        } | {
            right: number | import("../types").SharedValue<number>;
            width: number | import("../types").SharedValue<number>;
        } | {
            top: number | import("../types").SharedValue<number>;
            height: number | import("../types").SharedValue<number>;
        } | {
            bottom: number | import("../types").SharedValue<number>;
            height: number | import("../types").SharedValue<number>;
        } | null | undefined;
        activeCursor?: import("../..").ActiveCursor | import("../types").SharedValue<import("../..").ActiveCursor> | undefined;
        mouseButton?: import("../..").MouseButton | import("../types").SharedValue<import("../..").MouseButton> | undefined;
        cancelsTouchesInView?: boolean | import("../types").SharedValue<boolean> | undefined;
        cancelsJSResponder?: boolean | import("../types").SharedValue<boolean> | undefined;
        manualActivation?: boolean | import("../types").SharedValue<boolean> | undefined;
    } & import("../types").GestureCallbacks<import("../hooks/gestures/native/NativeTypes").NativeHandlerData> & import("../hooks/gestures/native/NativeTypes").NativeGestureNativeProperties & import("../types").ExternalRelations & import("../types/NativeWrapperType").WrapperSpecificProperties<unknown>): React.JSX.Element;
    displayName: any;
};
export declare const Switch: {
    (props: import("react-native").SwitchProps & {
        disableReanimated?: boolean | undefined;
        useAnimated?: boolean | undefined;
        testID?: string | undefined;
    } & {
        runOnJS?: boolean | import("../types").SharedValue<boolean> | undefined;
        enabled?: boolean | import("../types").SharedValue<boolean> | undefined;
        shouldCancelWhenOutside?: boolean | import("../types").SharedValue<boolean> | undefined;
        hitSlop?: number | import("../types").SharedValue<number> | import("../types").SharedValue<null> | {
            left?: number | import("../types").SharedValue<number> | undefined;
            right?: number | import("../types").SharedValue<number> | undefined;
            top?: number | import("../types").SharedValue<number> | undefined;
            bottom?: number | import("../types").SharedValue<number> | undefined;
            vertical?: number | import("../types").SharedValue<number> | undefined;
            horizontal?: number | import("../types").SharedValue<number> | undefined;
        } | {
            left: number | import("../types").SharedValue<number>;
            width: number | import("../types").SharedValue<number>;
        } | {
            right: number | import("../types").SharedValue<number>;
            width: number | import("../types").SharedValue<number>;
        } | {
            top: number | import("../types").SharedValue<number>;
            height: number | import("../types").SharedValue<number>;
        } | {
            bottom: number | import("../types").SharedValue<number>;
            height: number | import("../types").SharedValue<number>;
        } | null | undefined;
        activeCursor?: import("../..").ActiveCursor | import("../types").SharedValue<import("../..").ActiveCursor> | undefined;
        mouseButton?: import("../..").MouseButton | import("../types").SharedValue<import("../..").MouseButton> | undefined;
        cancelsTouchesInView?: boolean | import("../types").SharedValue<boolean> | undefined;
        cancelsJSResponder?: boolean | import("../types").SharedValue<boolean> | undefined;
        manualActivation?: boolean | import("../types").SharedValue<boolean> | undefined;
    } & import("../types").GestureCallbacks<import("../hooks/gestures/native/NativeTypes").NativeHandlerData> & import("../hooks/gestures/native/NativeTypes").NativeGestureNativeProperties & import("../types").ExternalRelations & import("../types/NativeWrapperType").WrapperSpecificProperties<unknown>): React.JSX.Element;
    displayName: any;
};
export declare const TextInput: {
    (props: import("react-native").TextInputProps & {
        disableReanimated?: boolean | undefined;
        useAnimated?: boolean | undefined;
        testID?: string | undefined;
    } & {
        runOnJS?: boolean | import("../types").SharedValue<boolean> | undefined;
        enabled?: boolean | import("../types").SharedValue<boolean> | undefined;
        shouldCancelWhenOutside?: boolean | import("../types").SharedValue<boolean> | undefined;
        hitSlop?: number | import("../types").SharedValue<number> | import("../types").SharedValue<null> | {
            left?: number | import("../types").SharedValue<number> | undefined;
            right?: number | import("../types").SharedValue<number> | undefined;
            top?: number | import("../types").SharedValue<number> | undefined;
            bottom?: number | import("../types").SharedValue<number> | undefined;
            vertical?: number | import("../types").SharedValue<number> | undefined;
            horizontal?: number | import("../types").SharedValue<number> | undefined;
        } | {
            left: number | import("../types").SharedValue<number>;
            width: number | import("../types").SharedValue<number>;
        } | {
            right: number | import("../types").SharedValue<number>;
            width: number | import("../types").SharedValue<number>;
        } | {
            top: number | import("../types").SharedValue<number>;
            height: number | import("../types").SharedValue<number>;
        } | {
            bottom: number | import("../types").SharedValue<number>;
            height: number | import("../types").SharedValue<number>;
        } | null | undefined;
        activeCursor?: import("../..").ActiveCursor | import("../types").SharedValue<import("../..").ActiveCursor> | undefined;
        mouseButton?: import("../..").MouseButton | import("../types").SharedValue<import("../..").MouseButton> | undefined;
        cancelsTouchesInView?: boolean | import("../types").SharedValue<boolean> | undefined;
        cancelsJSResponder?: boolean | import("../types").SharedValue<boolean> | undefined;
        manualActivation?: boolean | import("../types").SharedValue<boolean> | undefined;
    } & import("../types").GestureCallbacks<import("../hooks/gestures/native/NativeTypes").NativeHandlerData> & import("../hooks/gestures/native/NativeTypes").NativeGestureNativeProperties & import("../types").ExternalRelations & import("../types/NativeWrapperType").WrapperSpecificProperties<unknown>): React.JSX.Element;
    displayName: any;
};
export declare const DrawerLayoutAndroid: () => React.JSX.Element;
export declare const RefreshControl: {
    (props: import("react-native").ViewProps & {
        disableReanimated?: boolean | undefined;
        useAnimated?: boolean | undefined;
        testID?: string | undefined;
    } & {
        runOnJS?: boolean | import("../types").SharedValue<boolean> | undefined;
        enabled?: boolean | import("../types").SharedValue<boolean> | undefined;
        shouldCancelWhenOutside?: boolean | import("../types").SharedValue<boolean> | undefined;
        hitSlop?: number | import("../types").SharedValue<number> | import("../types").SharedValue<null> | {
            left?: number | import("../types").SharedValue<number> | undefined;
            right?: number | import("../types").SharedValue<number> | undefined;
            top?: number | import("../types").SharedValue<number> | undefined;
            bottom?: number | import("../types").SharedValue<number> | undefined;
            vertical?: number | import("../types").SharedValue<number> | undefined;
            horizontal?: number | import("../types").SharedValue<number> | undefined;
        } | {
            left: number | import("../types").SharedValue<number>;
            width: number | import("../types").SharedValue<number>;
        } | {
            right: number | import("../types").SharedValue<number>;
            width: number | import("../types").SharedValue<number>;
        } | {
            top: number | import("../types").SharedValue<number>;
            height: number | import("../types").SharedValue<number>;
        } | {
            bottom: number | import("../types").SharedValue<number>;
            height: number | import("../types").SharedValue<number>;
        } | null | undefined;
        activeCursor?: import("../..").ActiveCursor | import("../types").SharedValue<import("../..").ActiveCursor> | undefined;
        mouseButton?: import("../..").MouseButton | import("../types").SharedValue<import("../..").MouseButton> | undefined;
        cancelsTouchesInView?: boolean | import("../types").SharedValue<boolean> | undefined;
        cancelsJSResponder?: boolean | import("../types").SharedValue<boolean> | undefined;
        manualActivation?: boolean | import("../types").SharedValue<boolean> | undefined;
    } & import("../types").GestureCallbacks<import("../hooks/gestures/native/NativeTypes").NativeHandlerData> & import("../hooks/gestures/native/NativeTypes").NativeGestureNativeProperties & import("../types").ExternalRelations & import("../types/NativeWrapperType").WrapperSpecificProperties<unknown>): React.JSX.Element;
    displayName: any;
};
export declare const FlatList: <ItemT>(props: FlatListProps<ItemT>) => React.JSX.Element;
//# sourceMappingURL=GestureComponents.web.d.ts.map