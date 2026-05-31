import React from 'react';
import type { BaseButtonProps, BorderlessButtonProps, RawButtonProps, RectButtonProps } from './GestureButtonsProps';
/**
 * @deprecated `RawButton` is deprecated, use `Clickable` instead
 */
export declare const RawButton: (props: RawButtonProps) => React.JSX.Element;
/**
 * @deprecated `BaseButton` is deprecated, use `Touchable` instead
 */
export declare const BaseButton: (props: BaseButtonProps) => React.JSX.Element;
/**
 * @deprecated `RectButton` is deprecated, use `Touchable` with `activeUnderlayOpacity={0.7}` instead
 */
export declare const RectButton: (props: RectButtonProps) => React.JSX.Element;
/**
 * @deprecated `BorderlessButton` is deprecated, use `Touchable` with `activeOpacity={0.3}` instead
 */
export declare const BorderlessButton: (props: BorderlessButtonProps) => React.JSX.Element;
export { default as PureNativeButton } from '../../components/GestureHandlerButton';
//# sourceMappingURL=GestureButtons.d.ts.map