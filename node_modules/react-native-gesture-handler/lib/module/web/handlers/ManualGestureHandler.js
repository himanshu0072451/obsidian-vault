"use strict";

import { SingleGestureName } from '../../v3/types';
import GestureHandler from './GestureHandler';
export default class ManualGestureHandler extends GestureHandler {
  isContinuous = true;
  constructor(delegate) {
    super(delegate);
    this.name = SingleGestureName.Manual;
  }
  onPointerDown(event) {
    this.tracker.addToTracker(event);
    super.onPointerDown(event);
    this.begin();
  }
  onPointerAdd(event) {
    this.tracker.addToTracker(event);
    super.onPointerAdd(event);
  }
  onPointerMove(event) {
    this.tracker.track(event);
    super.onPointerMove(event);
  }
  onPointerOutOfBounds(event) {
    this.tracker.track(event);
    super.onPointerOutOfBounds(event);
  }
  onPointerUp(event) {
    super.onPointerUp(event);
    this.tracker.removeFromTracker(event.pointerId);
  }
  onPointerRemove(event) {
    super.onPointerRemove(event);
    this.tracker.removeFromTracker(event.pointerId);
  }
}
//# sourceMappingURL=ManualGestureHandler.js.map