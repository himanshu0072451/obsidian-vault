"use strict";

import { State } from '../../State';
import { SingleGestureName } from '../../v3/types';
import { DEFAULT_TOUCH_SLOP } from '../constants';
import { WheelDevice } from '../interfaces';
import GestureHandler from './GestureHandler';
const DEFAULT_MIN_POINTERS = 1;
const DEFAULT_MAX_POINTERS = 10;
const DEFAULT_MIN_DIST_SQ = DEFAULT_TOUCH_SLOP * DEFAULT_TOUCH_SLOP;
export default class PanGestureHandler extends GestureHandler {
  isContinuous = true;
  velocityX = 0;
  velocityY = 0;
  minDist = undefined;
  minDistSq = DEFAULT_MIN_DIST_SQ;
  activeOffsetXStart = -Number.MAX_SAFE_INTEGER;
  activeOffsetXEnd = Number.MIN_SAFE_INTEGER;
  failOffsetXStart = Number.MIN_SAFE_INTEGER;
  failOffsetXEnd = Number.MAX_SAFE_INTEGER;
  activeOffsetYStart = Number.MAX_SAFE_INTEGER;
  activeOffsetYEnd = Number.MIN_SAFE_INTEGER;
  failOffsetYStart = Number.MIN_SAFE_INTEGER;
  failOffsetYEnd = Number.MAX_SAFE_INTEGER;
  minVelocityX = Number.MAX_SAFE_INTEGER;
  minVelocityY = Number.MAX_SAFE_INTEGER;
  minVelocitySq = Number.MAX_SAFE_INTEGER;
  minPointers = DEFAULT_MIN_POINTERS;
  maxPointers = DEFAULT_MAX_POINTERS;
  startX = 0;
  startY = 0;
  offsetX = 0;
  offsetY = 0;
  lastX = 0;
  lastY = 0;
  activateAfterLongPress = 0;
  activationTimeout = 0;
  enableTrackpadTwoFingerGesture = false;
  endWheelTimeout = 0;
  wheelDevice = WheelDevice.UNDETERMINED;
  hasCustomActivationCriteria = false;
  constructor(delegate) {
    super(delegate);
    this.name = SingleGestureName.Pan;
  }
  updateGestureConfig(config) {
    super.updateGestureConfig(config);
    if (config.minPointers !== undefined) {
      this.minPointers = config.minPointers;
    }
    if (config.maxPointers !== undefined) {
      this.maxPointers = config.maxPointers;
    }
    if (config.minVelocity !== undefined) {
      this.minVelocityX = config.minVelocity;
      this.minVelocityY = config.minVelocity;
      this.hasCustomActivationCriteria = true;
    }
    if (config.minVelocityX !== undefined) {
      this.minVelocityX = config.minVelocityX;
      this.hasCustomActivationCriteria = true;
    }
    if (config.minVelocityY !== undefined) {
      this.minVelocityY = config.minVelocityY;
      this.hasCustomActivationCriteria = true;
    }
    if (config.activateAfterLongPress !== undefined) {
      this.activateAfterLongPress = config.activateAfterLongPress;
    }
    if (config.activeOffsetXStart !== undefined) {
      this.activeOffsetXStart = config.activeOffsetXStart;
      this.hasCustomActivationCriteria = true;
    }
    if (config.activeOffsetXEnd !== undefined) {
      this.activeOffsetXEnd = config.activeOffsetXEnd;
      this.hasCustomActivationCriteria = true;
    }
    if (config.failOffsetXStart !== undefined) {
      this.failOffsetXStart = config.failOffsetXStart;
      this.hasCustomActivationCriteria = true;
    }
    if (config.failOffsetXEnd !== undefined) {
      this.failOffsetXEnd = config.failOffsetXEnd;
      this.hasCustomActivationCriteria = true;
    }
    if (config.activeOffsetYStart !== undefined) {
      this.activeOffsetYStart = config.activeOffsetYStart;
      this.hasCustomActivationCriteria = true;
    }
    if (config.activeOffsetYEnd !== undefined) {
      this.activeOffsetYEnd = config.activeOffsetYEnd;
      this.hasCustomActivationCriteria = true;
    }
    if (config.failOffsetYStart !== undefined) {
      this.failOffsetYStart = config.failOffsetYStart;
      this.hasCustomActivationCriteria = true;
    }
    if (config.failOffsetYEnd !== undefined) {
      this.failOffsetYEnd = config.failOffsetYEnd;
      this.hasCustomActivationCriteria = true;
    }
    if (config.enableTrackpadTwoFingerGesture !== undefined) {
      this.enableTrackpadTwoFingerGesture = config.enableTrackpadTwoFingerGesture;
    }
    if (config.minDist !== undefined) {
      this.minDist = config.minDist;
      this.minDistSq = config.minDist * config.minDist;
    } else if (this.minDist === undefined && this.hasCustomActivationCriteria) {
      this.minDistSq = Number.MAX_SAFE_INTEGER;
    }
  }
  resetConfig() {
    super.resetConfig();
    this.activeOffsetXStart = -Number.MAX_SAFE_INTEGER;
    this.activeOffsetXEnd = Number.MIN_SAFE_INTEGER;
    this.failOffsetXStart = Number.MIN_SAFE_INTEGER;
    this.failOffsetXEnd = Number.MAX_SAFE_INTEGER;
    this.activeOffsetYStart = Number.MAX_SAFE_INTEGER;
    this.activeOffsetYEnd = Number.MIN_SAFE_INTEGER;
    this.failOffsetYStart = Number.MIN_SAFE_INTEGER;
    this.failOffsetYEnd = Number.MAX_SAFE_INTEGER;
    this.minVelocityX = Number.MAX_SAFE_INTEGER;
    this.minVelocityY = Number.MAX_SAFE_INTEGER;
    this.minVelocitySq = Number.MAX_SAFE_INTEGER;
    this.minDist = undefined;
    this.minDistSq = DEFAULT_MIN_DIST_SQ;
    this.minPointers = DEFAULT_MIN_POINTERS;
    this.maxPointers = DEFAULT_MAX_POINTERS;
    this.activateAfterLongPress = 0;
    this.hasCustomActivationCriteria = false;
  }
  transformNativeEvent() {
    const translationX = this.getTranslationX();
    const translationY = this.getTranslationY();
    return {
      ...super.transformNativeEvent(),
      translationX: isNaN(translationX) ? 0 : translationX,
      translationY: isNaN(translationY) ? 0 : translationY,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      stylusData: this.stylusData
    };
  }
  getTranslationX() {
    return this.lastX - this.startX + this.offsetX;
  }
  getTranslationY() {
    return this.lastY - this.startY + this.offsetY;
  }
  clearActivationTimeout() {
    clearTimeout(this.activationTimeout);
  }
  updateLastCoords() {
    const {
      x,
      y
    } = this.tracker.getAbsoluteCoordsAverage();
    this.lastX = x;
    this.lastY = y;
  }
  updateVelocity(pointerId) {
    const velocities = this.tracker.getVelocity(pointerId);
    this.velocityX = velocities?.x ?? 0;
    this.velocityY = velocities?.y ?? 0;
  }

  // Events Handling
  onPointerDown(event) {
    if (!this.isButtonInConfig(event.button)) {
      return;
    }
    this.tracker.addToTracker(event);
    this.stylusData = event.stylusData;
    super.onPointerDown(event);
    this.updateLastCoords();
    this.startX = this.lastX;
    this.startY = this.lastY;
    this.tryBegin(event);
    this.checkBegan();
  }
  onPointerAdd(event) {
    this.tracker.addToTracker(event);
    super.onPointerAdd(event);
    this.tryBegin(event);
    this.offsetX += this.lastX - this.startX;
    this.offsetY += this.lastY - this.startY;
    this.updateLastCoords();
    this.startX = this.lastX;
    this.startY = this.lastY;
    if (this.tracker.trackedPointersCount > this.maxPointers) {
      if (this.state === State.ACTIVE) {
        this.cancel();
      } else {
        this.fail();
      }
    } else {
      this.checkBegan();
    }
  }
  onPointerUp(event) {
    this.stylusData = event.stylusData;
    super.onPointerUp(event);
    if (this.state === State.ACTIVE) {
      const lastCoords = this.tracker.getAbsoluteCoordsAverage();
      this.lastX = lastCoords.x;
      this.lastY = lastCoords.y;
    }
    this.tracker.removeFromTracker(event.pointerId);
    if (this.tracker.trackedPointersCount === 0) {
      this.clearActivationTimeout();
    }
    if (this.state === State.ACTIVE) {
      this.end();
    } else {
      this.resetProgress();
      this.fail();
    }
  }
  onPointerRemove(event) {
    super.onPointerRemove(event);
    this.tracker.removeFromTracker(event.pointerId);
    this.offsetX += this.lastX - this.startX;
    this.offsetY += this.lastY - this.startY;
    this.updateLastCoords();
    this.startX = this.lastX;
    this.startY = this.lastY;
    if (!(this.state === State.ACTIVE && this.tracker.trackedPointersCount < this.minPointers)) {
      this.checkBegan();
    }
  }
  onPointerMove(event) {
    this.tracker.track(event);
    this.stylusData = event.stylusData;
    this.updateLastCoords();
    this.updateVelocity(event.pointerId);
    this.checkBegan();
    super.onPointerMove(event);
  }
  onPointerOutOfBounds(event) {
    if (this.shouldCancelWhenOutside) {
      return;
    }
    this.tracker.track(event);
    this.stylusData = event.stylusData;
    this.updateLastCoords();
    this.updateVelocity(event.pointerId);
    this.checkBegan();
    if (this.state === State.ACTIVE) {
      super.onPointerOutOfBounds(event);
    }
  }
  scheduleWheelEnd(event) {
    clearTimeout(this.endWheelTimeout);
    this.endWheelTimeout = setTimeout(() => {
      if (this.state === State.ACTIVE) {
        this.end();
        this.tracker.removeFromTracker(event.pointerId);
        this.state = State.UNDETERMINED;
      }
      this.wheelDevice = WheelDevice.UNDETERMINED;
    }, 30);
  }
  onWheel(event) {
    if (this.wheelDevice === WheelDevice.MOUSE || !this.enableTrackpadTwoFingerGesture) {
      return;
    }
    if (this.state === State.UNDETERMINED) {
      this.wheelDevice = event.wheelDeltaY % 120 !== 0 ? WheelDevice.TOUCHPAD : WheelDevice.MOUSE;
      if (this.wheelDevice === WheelDevice.MOUSE) {
        this.scheduleWheelEnd(event);
        return;
      }
      this.tracker.addToTracker(event);
      this.updateLastCoords();
      this.startX = this.lastX;
      this.startY = this.lastY;
      this.begin();
      this.activate();
    }
    this.tracker.track(event);
    this.updateLastCoords();
    this.updateVelocity(event.pointerId);
    this.tryToSendMoveEvent(false, event);
    this.scheduleWheelEnd(event);
  }
  shouldActivate() {
    const dx = this.getTranslationX();
    if (this.activeOffsetXStart !== Number.MAX_SAFE_INTEGER && dx < this.activeOffsetXStart) {
      return true;
    }
    if (this.activeOffsetXEnd !== Number.MIN_SAFE_INTEGER && dx > this.activeOffsetXEnd) {
      return true;
    }
    const dy = this.getTranslationY();
    if (this.activeOffsetYStart !== Number.MAX_SAFE_INTEGER && dy < this.activeOffsetYStart) {
      return true;
    }
    if (this.activeOffsetYEnd !== Number.MIN_SAFE_INTEGER && dy > this.activeOffsetYEnd) {
      return true;
    }
    const distanceSq = dx * dx + dy * dy;
    if (this.minDistSq !== Number.MAX_SAFE_INTEGER && distanceSq >= this.minDistSq) {
      return true;
    }
    const vx = this.velocityX;
    if (this.minVelocityX !== Number.MAX_SAFE_INTEGER && (this.minVelocityX < 0 && vx <= this.minVelocityX || this.minVelocityX >= 0 && this.minVelocityX <= vx)) {
      return true;
    }
    const vy = this.velocityY;
    if (this.minVelocityY !== Number.MAX_SAFE_INTEGER && (this.minVelocityY < 0 && vy <= this.minVelocityY || this.minVelocityY >= 0 && this.minVelocityY <= vy)) {
      return true;
    }
    const velocitySq = vx * vx + vy * vy;
    return this.minVelocitySq !== Number.MAX_SAFE_INTEGER && velocitySq >= this.minVelocitySq;
  }
  shouldFail() {
    const dx = this.getTranslationX();
    const dy = this.getTranslationY();
    const distanceSq = dx * dx + dy * dy;
    if (this.activateAfterLongPress > 0 && distanceSq > DEFAULT_MIN_DIST_SQ) {
      this.clearActivationTimeout();
      return true;
    }
    if (this.failOffsetXStart !== Number.MIN_SAFE_INTEGER && dx < this.failOffsetXStart) {
      return true;
    }
    if (this.failOffsetXEnd !== Number.MAX_SAFE_INTEGER && dx > this.failOffsetXEnd) {
      return true;
    }
    if (this.failOffsetYStart !== Number.MIN_SAFE_INTEGER && dy < this.failOffsetYStart) {
      return true;
    }
    return this.failOffsetYEnd !== Number.MAX_SAFE_INTEGER && dy > this.failOffsetYEnd;
  }
  tryBegin(event) {
    if (this.state === State.UNDETERMINED && this.tracker.trackedPointersCount >= this.minPointers) {
      this.resetProgress();
      this.offsetX = 0;
      this.offsetY = 0;
      this.velocityX = 0;
      this.velocityY = 0;
      this.begin();
      if (this.activateAfterLongPress > 0) {
        this.activationTimeout = setTimeout(() => {
          this.activate();
        }, this.activateAfterLongPress);
      }
    } else {
      this.updateVelocity(event.pointerId);
    }
  }
  checkBegan() {
    if (this.state === State.BEGAN) {
      if (this.shouldFail()) {
        this.fail();
      } else if (this.shouldActivate()) {
        this.activate();
      }
    }
  }
  activate(force = false) {
    if (this.state !== State.ACTIVE) {
      this.resetProgress();
    }
    super.activate(force);
  }
  onCancel() {
    this.clearActivationTimeout();
  }
  onReset() {
    this.clearActivationTimeout();
  }
  resetProgress() {
    if (this.state === State.ACTIVE) {
      return;
    }
    this.startX = this.lastX;
    this.startY = this.lastY;
  }
}
//# sourceMappingURL=PanGestureHandler.js.map