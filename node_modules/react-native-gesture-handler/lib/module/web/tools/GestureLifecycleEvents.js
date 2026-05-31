"use strict";

export const GestureLifecycleEvent = {
  Began: 'gh:gestureBegan',
  Canceled: 'gh:gestureCanceled'
};
export function dispatchGestureLifecycleEvent(view, name) {
  view?.dispatchEvent(new CustomEvent(name));
}
//# sourceMappingURL=GestureLifecycleEvents.js.map