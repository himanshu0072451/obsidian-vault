import type { PropsWithChildren } from 'react';
import * as React from 'react';
import GenericTouchable from './GenericTouchable';
import type { GenericTouchableProps } from './GenericTouchableProps';
/**
 * @deprecated TouchableWithoutFeedback will be removed in the future version of Gesture Handler. Use Pressable instead.
 */
export type TouchableWithoutFeedbackProps = GenericTouchableProps;
/**
 * @deprecated TouchableWithoutFeedback will be removed in the future version of Gesture Handler. Use Pressable instead.
 */
declare const TouchableWithoutFeedback: ({ delayLongPress, extraButtonProps, ...rest }: PropsWithChildren<TouchableWithoutFeedbackProps> & {
    ref?: React.Ref<GenericTouchable>;
}) => React.JSX.Element;
export default TouchableWithoutFeedback;
//# sourceMappingURL=TouchableWithoutFeedback.d.ts.map