"use strict";

import { DEFAULT_TOUCH_SLOP } from '../constants';
import { EventTypes } from '../interfaces';
export default class ScaleGestureDetector {
  inProgress = false;
  constructor(callbacks) {
    this.onScaleBegin = callbacks.onScaleBegin;
    this.onScale = callbacks.onScale;
    this.onScaleEnd = callbacks.onScaleEnd;
    this.spanSlop = DEFAULT_TOUCH_SLOP * 2;
    this.minSpan = 0;
  }
  onTouchEvent(event, tracker) {
    this.currentTime = event.time;
    const action = event.eventType;
    const numOfPointers = tracker.trackedPointersCount;

    // When the last second pointer lifts (going down to 1), pause without
    // touching span/time state so the gesture resumes cleanly on re-add.
    // When 3+ → 2+ pointers, fall through so configChanged resets the span
    // baseline to the remaining pointer set and avoids a scale jump.
    if (action === EventTypes.ADDITIONAL_POINTER_UP && numOfPointers <= 2) {
      return true;
    }
    const streamComplete = action === EventTypes.UP || action === EventTypes.CANCEL;
    if (action === EventTypes.DOWN || streamComplete) {
      if (this.inProgress) {
        this.onScaleEnd(this);
        this.inProgress = false;
        this.initialSpan = 0;
      }
      if (streamComplete) {
        return true;
      }
    }
    const configChanged = action === EventTypes.DOWN || action === EventTypes.ADDITIONAL_POINTER_UP || action === EventTypes.ADDITIONAL_POINTER_DOWN;
    const pointerUp = action === EventTypes.ADDITIONAL_POINTER_UP;
    const ignoredPointer = pointerUp ? event.pointerId : undefined;

    // Determine focal point

    const div = pointerUp ? numOfPointers - 1 : numOfPointers;
    const coordsSum = tracker.getAbsoluteCoordsSum(ignoredPointer);
    const focusX = coordsSum.x / div;
    const focusY = coordsSum.y / div;

    // Determine average deviation from focal point

    let devSumX = 0;
    let devSumY = 0;
    tracker.trackedPointers.forEach((value, key) => {
      if (key === ignoredPointer) {
        return;
      }
      devSumX += Math.abs(value.abosoluteCoords.x - focusX);
      devSumY += Math.abs(value.abosoluteCoords.y - focusY);
    });
    const devX = devSumX / div;
    const devY = devSumY / div;
    const spanX = devX * 2;
    const spanY = devY * 2;
    const span = Math.hypot(spanX, spanY);

    // Begin/end events
    const wasInProgress = this.inProgress;
    this._focusX = focusX;
    this._focusY = focusY;
    if (this.inProgress && (span < this.minSpan || configChanged)) {
      this.onScaleEnd(this);
      this.inProgress = false;
      this.initialSpan = span;
    }
    if (configChanged) {
      this.initialSpan = this.prevSpan = this._currentSpan = span;
    }
    if (!this.inProgress && span >= this.minSpan && (wasInProgress || Math.abs(span - this.initialSpan) > this.spanSlop)) {
      this.prevSpan = this._currentSpan = span;
      this.prevTime = this.currentTime;
      this.inProgress = this.onScaleBegin(this);
    }

    // Handle motion
    if (action !== EventTypes.MOVE) {
      return true;
    }
    this._currentSpan = span;
    if (this.inProgress && !this.onScale(this)) {
      return true;
    }
    this.prevSpan = this.currentSpan;
    this.prevTime = this.currentTime;
    return true;
  }
  calculateScaleFactor(numOfPointers) {
    if (numOfPointers < 2) {
      return 1;
    }
    return this.prevSpan > 0 ? this.currentSpan / this.prevSpan : 1;
  }
  get currentSpan() {
    return this._currentSpan;
  }
  get focusX() {
    return this._focusX;
  }
  get focusY() {
    return this._focusY;
  }
  get timeDelta() {
    return this.currentTime - this.prevTime;
  }
}
//# sourceMappingURL=ScaleGestureDetector.js.map