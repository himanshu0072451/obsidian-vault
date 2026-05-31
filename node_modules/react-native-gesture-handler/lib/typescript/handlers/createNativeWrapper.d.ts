import * as React from 'react';
import type { NativeViewGestureHandlerProps } from './NativeViewGestureHandler';
/**
 * @deprecated `createNativeWrapper` is deprecated and will be removed in favor of using `GestureDetector` with `Native` gesture directly.
 */
export default function createNativeWrapper<P>(Component: React.ComponentType<P>, config?: Readonly<NativeViewGestureHandlerProps>): {
    (props: P & NativeViewGestureHandlerProps & {
        ref?: React.Ref<React.ComponentType<any> | null> | undefined;
    }): React.JSX.Element;
    displayName: any;
};
//# sourceMappingURL=createNativeWrapper.d.ts.map