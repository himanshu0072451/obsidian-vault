"use strict";

import { useEffect } from 'react';
import { NATIVE_GESTURE_ROLE_ATTRIBUTE } from '../../web/constants';
import { NativeGestureRole } from '../../web/interfaces';
export function useNativeGestureRole(viewRef, children) {
  useEffect(() => {
    const child = viewRef.current?.firstChild;
    if (!(child instanceof HTMLElement)) {
      return;
    }

    // @ts-ignore This exists on React.ReactNode
    const displayName = children?.type?.displayName;
    if (displayName === NativeGestureRole.ScrollView) {
      child.setAttribute(NATIVE_GESTURE_ROLE_ATTRIBUTE, NativeGestureRole.ScrollView);
    } else if (displayName === NativeGestureRole.Switch) {
      child.setAttribute(NATIVE_GESTURE_ROLE_ATTRIBUTE, NativeGestureRole.Switch);
    } else if (displayName === NativeGestureRole.Button) {
      child.setAttribute(NATIVE_GESTURE_ROLE_ATTRIBUTE, NativeGestureRole.Button);
    }
    return () => {
      child.removeAttribute(NATIVE_GESTURE_ROLE_ATTRIBUTE);
    };
  }, [children, viewRef]);
}
//# sourceMappingURL=useNativeGestureRole.web.js.map