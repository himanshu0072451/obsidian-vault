import type { FlingGestureNativeProperties } from '../hooks/gestures/fling/FlingTypes';
import type { HoverGestureNativeProperties } from '../hooks/gestures/hover/HoverTypes';
import type { LongPressGestureNativeProperties } from '../hooks/gestures/longPress/LongPressTypes';
import type { NativeGestureNativeProperties } from '../hooks/gestures/native/NativeTypes';
import type { PanGestureNativeProperties } from '../hooks/gestures/pan/PanTypes';
import type { TapGestureNativeConfig } from '../hooks/gestures/tap/TapTypes';
import type { InternalConfigProps } from './ConfigTypes';
export type HandlersPropsWhiteList = Set<keyof PanGestureNativeProperties> | Set<keyof FlingGestureNativeProperties> | Set<keyof HoverGestureNativeProperties> | Set<keyof LongPressGestureNativeProperties> | Set<keyof NativeGestureNativeProperties> | Set<keyof TapGestureNativeConfig>;
export type FilterNeverProperties<T> = {
    [K in keyof T as T[K] extends never ? never : K]: T[K];
};
export type ExcludeInternalConfigProps<T> = Omit<T, keyof InternalConfigProps<unknown>>;
//# sourceMappingURL=UtilityTypes.d.ts.map