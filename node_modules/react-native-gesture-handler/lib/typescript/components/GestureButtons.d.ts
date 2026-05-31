import * as React from 'react';
import type { LegacyBaseButtonProps, LegacyBorderlessButtonProps, LegacyRawButtonProps, LegacyRectButtonProps } from './GestureButtonsProps';
import { type ButtonProps } from './GestureHandlerButton';
declare const LegacyRawButtonInner: {
    (props: LegacyRawButtonProps & {
        needsOffscreenAlphaCompositing?: boolean;
    } & import("..").NativeViewGestureHandlerProps & {
        ref?: React.Ref<React.ComponentType<any> | null> | undefined;
    }): React.JSX.Element;
    displayName: any;
};
/**
 * @deprecated use `RawButton` instead
 */
export declare const LegacyRawButton: (props: Omit<React.ComponentProps<typeof LegacyRawButtonInner>, "needsOffscreenAlphaCompositing">) => React.JSX.Element;
/**
 * @deprecated use `BaseButton` instead
 */
export declare const LegacyBaseButton: ({ ref, ...props }: Omit<LegacyBaseButtonProps, "innerRef"> & {
    ref?: React.Ref<React.ComponentType<any>> | undefined;
}) => React.JSX.Element;
/**
 * @deprecated use `RectButton` instead
 */
export declare const LegacyRectButton: ({ ref, ...props }: Omit<LegacyRectButtonProps, "innerRef"> & {
    ref?: React.Ref<React.ComponentType<any>> | undefined;
}) => React.JSX.Element;
/**
 * @deprecated use `BorderlessButton` instead
 */
export declare const LegacyBorderlessButton: ({ ref, ...props }: Omit<LegacyBorderlessButtonProps, "innerRef"> & {
    ref?: React.Ref<React.ComponentType<any>> | undefined;
}) => React.JSX.Element;
/**
 * @deprecated use `PureNativeButton` instead
 */
export declare const LegacyPureNativeButton: (props: Omit<ButtonProps, "needsOffscreenAlphaCompositing">) => React.JSX.Element;
export {};
//# sourceMappingURL=GestureButtons.d.ts.map