"use strict";

import { State } from '../../State';
import { SingleGestureName } from '../../v3/types';
import { DEFAULT_TOUCH_SLOP } from '../constants';
import ScaleGestureDetector from '../detectors/ScaleGestureDetector';
import GestureHandler from './GestureHandler';
export default class PinchGestureHandler extends GestureHandler {
  isContinuous = true;
  scale = 1;
  velocity = 0;
  startingSpan = 0;
  spanSlop = DEFAULT_TOUCH_SLOP;
  scaleDetectorListener = {
    onScaleBegin: detector => {
      this.startingSpan = detector.currentSpan;
      return true;
    },
    onScale: detector => {
      const prevScaleFactor = this.scale;
      this.scale *= detector.calculateScaleFactor(this.tracker.trackedPointersCount);
      const delta = detector.timeDelta;
      if (delta > 0) {
        this.velocity = (this.scale - prevScaleFactor) / delta;
      }
      if (Math.abs(this.startingSpan - detector.currentSpan) >= this.spanSlop && this.state === State.BEGAN) {
        this.activate();
      }
      return true;
    },
    onScaleEnd: _detector => {}
  };
  scaleGestureDetector = new ScaleGestureDetector(this.scaleDetectorListener);
  constructor(delegate) {
    super(delegate);
    this.name = SingleGestureName.Pinch;
  }
  init(ref, propsRef, actionType) {
    super.init(ref, propsRef, actionType);
    this.shouldCancelWhenOutside = false;
  }
  transformNativeEvent() {
    const focal = this.delegate.absoluteToLocal(this.scaleGestureDetector.focusX, this.scaleGestureDetector.focusY);
    return {
      focalX: focal.x,
      focalY: focal.y,
      velocity: this.velocity,
      scale: this.scale
    };
  }
  onPointerDown(event) {
    this.tracker.addToTracker(event);
    super.onPointerDown(event);
  }
  onPointerAdd(event) {
    this.tracker.addToTracker(event);
    super.onPointerAdd(event);
    this.scaleGestureDetector.onTouchEvent(event, this.tracker);
    this.tryBegin();
  }
  onPointerUp(event) {
    super.onPointerUp(event);
    this.tracker.removeFromTracker(event.pointerId);
    if (this.state === State.ACTIVE) {
      // We don't have to call it in the else branch as it would simply return `true`.
      this.scaleGestureDetector.onTouchEvent(event, this.tracker);
      this.end();
    } else {
      this.fail();
    }
  }
  onPointerRemove(event) {
    super.onPointerRemove(event);
    this.scaleGestureDetector.onTouchEvent(event, this.tracker);
    this.tracker.removeFromTracker(event.pointerId);
  }
  onPointerMove(event) {
    this.tracker.track(event);
    if (this.tracker.trackedPointersCount < 2) {
      return;
    }
    this.scaleGestureDetector.onTouchEvent(event, this.tracker);
    super.onPointerMove(event);
  }
  onPointerOutOfBounds(event) {
    this.tracker.track(event);
    if (this.tracker.trackedPointersCount < 2) {
      return;
    }
    this.scaleGestureDetector.onTouchEvent(event, this.tracker);
    super.onPointerOutOfBounds(event);
  }
  tryBegin() {
    if (this.state !== State.UNDETERMINED) {
      return;
    }
    this.resetProgress();
    this.begin();
  }
  activate(force) {
    if (this.state !== State.ACTIVE) {
      this.resetProgress();
    }
    super.activate(force);
  }
  onReset() {
    this.resetProgress();
  }
  resetProgress() {
    if (this.state === State.ACTIVE) {
      return;
    }
    this.velocity = 0;
    this.scale = 1;
  }
}
//# sourceMappingURL=PinchGestureHandler.js.map