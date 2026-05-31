"use strict";

import { State } from '../../State';
import { SingleGestureName } from '../../v3/types';
import RotationGestureDetector from '../detectors/RotationGestureDetector';
import GestureHandler from './GestureHandler';
const ROTATION_RECOGNITION_THRESHOLD = Math.PI / 36;
export default class RotationGestureHandler extends GestureHandler {
  isContinuous = true;
  rotation = 0;
  velocity = 0;
  cachedAnchorX = 0;
  cachedAnchorY = 0;
  rotationGestureListener = {
    onRotationBegin: _detector => true,
    onRotation: detector => {
      const previousRotation = this.rotation;
      this.rotation += detector.rotation;
      const delta = detector.timeDelta;
      if (delta > 0) {
        this.velocity = (this.rotation - previousRotation) / delta;
      }
      if (Math.abs(this.rotation) >= ROTATION_RECOGNITION_THRESHOLD && this.state === State.BEGAN) {
        this.activate();
      }
      return true;
    },
    onRotationEnd: _detector => {
      if (this.state === State.ACTIVE) {
        this.end();
      } else {
        this.fail();
      }
    }
  };
  rotationGestureDetector = new RotationGestureDetector(this.rotationGestureListener);
  constructor(delegate) {
    super(delegate);
    this.name = SingleGestureName.Rotation;
  }
  init(ref, propsRef, actionType) {
    super.init(ref, propsRef, actionType);
    this.shouldCancelWhenOutside = false;
  }
  transformNativeEvent() {
    const anchor = this.getAnchor();
    return {
      rotation: this.rotation ? this.rotation : 0,
      anchorX: anchor.x,
      anchorY: anchor.y,
      velocity: this.velocity ? this.velocity : 0
    };
  }
  getAnchor() {
    const absX = this.rotationGestureDetector.anchorX;
    const absY = this.rotationGestureDetector.anchorY;
    if (Number.isFinite(absX) && Number.isFinite(absY)) {
      return this.delegate.absoluteToLocal(absX, absY);
    }
    return {
      x: this.cachedAnchorX,
      y: this.cachedAnchorY
    };
  }
  onPointerDown(event) {
    this.tracker.addToTracker(event);
    super.onPointerDown(event);
  }
  onPointerAdd(event) {
    this.tracker.addToTracker(event);
    super.onPointerAdd(event);
    this.rotationGestureDetector.onTouchEvent(event, this.tracker);
    this.tryBegin();
  }
  onPointerMove(event) {
    this.tracker.track(event);
    if (this.tracker.trackedPointersCount < 2) {
      return;
    }
    const anchor = this.getAnchor();
    this.cachedAnchorX = anchor.x;
    this.cachedAnchorY = anchor.y;
    this.rotationGestureDetector.onTouchEvent(event, this.tracker);
    super.onPointerMove(event);
  }
  onPointerOutOfBounds(event) {
    this.tracker.track(event);
    if (this.tracker.trackedPointersCount < 2) {
      return;
    }
    const anchor = this.getAnchor();
    this.cachedAnchorX = anchor.x;
    this.cachedAnchorY = anchor.y;
    this.rotationGestureDetector.onTouchEvent(event, this.tracker);
    super.onPointerOutOfBounds(event);
  }
  onPointerUp(event) {
    super.onPointerUp(event);
    this.tracker.removeFromTracker(event.pointerId);
    this.rotationGestureDetector.onTouchEvent(event, this.tracker);
  }
  onPointerRemove(event) {
    super.onPointerRemove(event);
    this.rotationGestureDetector.onTouchEvent(event, this.tracker);
    this.tracker.removeFromTracker(event.pointerId);
  }
  tryBegin() {
    if (this.state !== State.UNDETERMINED) {
      return;
    }
    this.begin();
  }
  onReset() {
    if (this.state === State.ACTIVE) {
      return;
    }
    this.rotation = 0;
    this.velocity = 0;
    this.rotationGestureDetector.reset();
  }
}
//# sourceMappingURL=RotationGestureHandler.js.map