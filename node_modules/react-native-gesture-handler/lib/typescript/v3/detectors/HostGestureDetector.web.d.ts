import type { RefObject } from 'react';
import React from 'react';
import type { TouchAction, UserSelect } from '../../handlers/gestureHandlerCommon';
import { type PropsRef } from '../../web/interfaces';
export interface GestureHandlerDetectorProps extends PropsRef {
    handlerTags: number[];
    moduleId: number;
    children?: React.ReactNode;
    virtualChildren?: Set<VirtualChildrenWeb>;
    userSelect?: UserSelect | undefined;
    touchAction?: TouchAction | undefined;
    enableContextMenu?: boolean | undefined;
}
export interface VirtualChildrenWeb {
    viewTag: number;
    handlerTags: number[];
    viewRef: RefObject<Element | null>;
    userSelect?: UserSelect | undefined;
    touchAction?: TouchAction | undefined;
    enableContextMenu?: boolean | undefined;
}
declare const HostGestureDetector: (props: GestureHandlerDetectorProps) => React.JSX.Element;
export default HostGestureDetector;
//# sourceMappingURL=HostGestureDetector.web.d.ts.map