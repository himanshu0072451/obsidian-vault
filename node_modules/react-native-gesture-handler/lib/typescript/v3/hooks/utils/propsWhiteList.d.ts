import type { BaseGestureConfig, ExternalRelations, GestureCallbacks, HandlersPropsWhiteList, InternalConfigProps } from '../../types';
import { SingleGestureName } from '../../types';
export declare const allowedNativeProps: Set<"enabled" | "shouldCancelWhenOutside" | "hitSlop" | "cancelsTouchesInView" | "activeCursor" | "mouseButton" | "manualActivation" | "runOnJS" | "cancelsJSResponder" | "disableReanimated" | "useAnimated" | "testID" | keyof InternalConfigProps<unknown>>;
export declare const HandlerCallbacks: Set<keyof GestureCallbacks<unknown, unknown>>;
export declare const PropsToFilter: Set<BaseGestureConfig<unknown, unknown, unknown>>;
export declare const PropsWhiteLists: Map<SingleGestureName, HandlersPropsWhiteList>;
export declare const EMPTY_WHITE_LIST: Set<string>;
export declare const NativeWrapperProps: Set<"enabled" | "shouldCancelWhenOutside" | "hitSlop" | "cancelsTouchesInView" | "activeCursor" | "mouseButton" | "manualActivation" | "runOnJS" | "cancelsJSResponder" | keyof ExternalRelations | "disableReanimated" | "useAnimated" | "testID" | keyof import("../gestures/native/NativeTypes").NativeGestureNativeProperties | keyof GestureCallbacks<import("../gestures/native/NativeTypes").NativeHandlerData> | keyof import("../../types/NativeWrapperType").WrapperSpecificProperties<unknown>>;
//# sourceMappingURL=propsWhiteList.d.ts.map