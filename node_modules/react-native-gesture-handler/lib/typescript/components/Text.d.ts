import type { ComponentRef, Ref } from 'react';
import React from 'react';
import type { TextProps as RNTextProps } from 'react-native';
import { Text as RNText } from 'react-native';
type TextProps = RNTextProps & {
    ref?: Ref<ComponentRef<typeof RNText> | null>;
};
/**
 * @deprecated `LegacyText` is deprecated. Since Gesture Handler 3, you should wrap `Text` with `GestureDetector`, `InterceptingGestureDetector`, or `VirtualGestureDetector`.
 */
export declare const LegacyText: (props: TextProps) => React.JSX.Element;
/**
 * @deprecated `LegacyText` is deprecated. Since Gesture Handler 3, you should wrap `Text` with `GestureDetector`, `InterceptingGestureDetector`, or `VirtualGestureDetector`.
 */
export type LegacyText = typeof LegacyText & RNText;
export {};
//# sourceMappingURL=Text.d.ts.map