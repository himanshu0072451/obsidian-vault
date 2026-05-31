import type { PropsWithChildren, ReactElement } from 'react';
import React from 'react';
import type { FlatListProps as RNFlatListProps, RefreshControlProps as RNRefreshControlProps, ScrollViewProps as RNScrollViewProps, SwitchProps as RNSwitchProps, TextInputProps as RNTextInputProps } from 'react-native';
import { FlatList as RNFlatList, RefreshControl as RNRefreshControl, ScrollView as RNScrollView, Switch as RNSwitch, TextInput as RNTextInput } from 'react-native';
import type { NativeWrapperProperties } from '../types/NativeWrapperType';
export declare const RefreshControl: {
    (props: RNRefreshControlProps & {
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
    } & import("../types").GestureCallbacks<import("../hooks/gestures/native/NativeTypes").NativeHandlerData> & import("../hooks/gestures/native/NativeTypes").NativeGestureNativeProperties & import("../types").ExternalRelations & import("../types/NativeWrapperType").WrapperSpecificProperties<RNRefreshControl | null>): React.JSX.Element;
    displayName: any;
};
export type RefreshControl = typeof RefreshControl & RNRefreshControl;
export declare const ScrollView: (props: RNScrollViewProps & NativeWrapperProperties<RNScrollView | null>) => React.JSX.Element;
export type ScrollView = typeof ScrollView & RNScrollView;
export declare const Switch: {
    (props: RNSwitchProps & {
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
    } & import("../types").GestureCallbacks<import("../hooks/gestures/native/NativeTypes").NativeHandlerData> & import("../hooks/gestures/native/NativeTypes").NativeGestureNativeProperties & import("../types").ExternalRelations & import("../types/NativeWrapperType").WrapperSpecificProperties<RNSwitch | null>): React.JSX.Element;
    displayName: any;
};
export type Switch = typeof Switch & RNSwitch;
export declare const TextInput: {
    (props: RNTextInputProps & {
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
    } & import("../types").GestureCallbacks<import("../hooks/gestures/native/NativeTypes").NativeHandlerData> & import("../hooks/gestures/native/NativeTypes").NativeGestureNativeProperties & import("../types").ExternalRelations & import("../types/NativeWrapperType").WrapperSpecificProperties<RNTextInput | null>): React.JSX.Element;
    displayName: any;
};
export type TextInput = typeof TextInput & RNTextInput;
export declare const FlatList: <ItemT = any>(props: PropsWithChildren<Omit<RNFlatListProps<ItemT>, "renderScrollComponent" | "ref"> & NativeWrapperProperties<RNFlatList<ItemT> | null>>) => ReactElement | null;
export type FlatList<ItemT = any> = typeof FlatList & RNFlatList<ItemT>;
//# sourceMappingURL=GestureComponents.d.ts.map