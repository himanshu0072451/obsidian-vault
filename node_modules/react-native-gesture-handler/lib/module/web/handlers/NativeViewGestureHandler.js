"use strict";

import { Platform } from 'react-native';
import { State } from '../../State';
import { deepEqual } from '../../utils';
import { SingleGestureName } from '../../v3/types';
import { DEFAULT_TOUCH_SLOP, NATIVE_GESTURE_ROLE_ATTRIBUTE } from '../constants';
import { NativeGestureRole } from '../interfaces';
import { dispatchGestureLifecycleEvent, GestureLifecycleEvent } from '../tools/GestureLifecycleEvents';
import GestureHandler from './GestureHandler';
export default class NativeViewGestureHandler extends GestureHandler {
  isContinuous = true;
  role = null;

  // TODO: Implement logic for activation on start properly
  shouldActivateOnStart = false;
  disallowInterruption = false;
  yieldsToContinuousGestures = false;
  startX = 0;
  startY = 0;
  minDistSq = DEFAULT_TOUCH_SLOP * DEFAULT_TOUCH_SLOP;
  lastActiveHandlerData = null;
  constructor(delegate) {
    super(delegate);
    this.name = SingleGestureName.Native;
  }
  init(ref, propsRef, actionType) {
    super.init(ref, propsRef, actionType);
    this.shouldCancelWhenOutside = true;
    if (Platform.OS !== 'web') {
      return;
    }
    const view = this.delegate.view;
    this.restoreViewStyles(view);
    if (this.usesNativeOrVirtualDetector()) {
      this.role = view.getAttribute(NATIVE_GESTURE_ROLE_ATTRIBUTE) ?? null;
    } else {
      if (view.getAttribute('role') === 'button') {
        this.role = NativeGestureRole.Button;
      } else if (view.querySelector(':scope > input[role="switch"]') !== null) {
        this.role = NativeGestureRole.Switch;
      }
    }
  }
  updateGestureConfig(config) {
    super.updateGestureConfig(config);
    if (config.shouldActivateOnStart !== undefined) {
      this.shouldActivateOnStart = config.shouldActivateOnStart;
    }
    if (config.disallowInterruption !== undefined) {
      this.disallowInterruption = config.disallowInterruption;
    }
    if (config.yieldsToContinuousGestures !== undefined) {
      this.yieldsToContinuousGestures = config.yieldsToContinuousGestures;
    }
    const view = this.delegate.view;
    this.restoreViewStyles(view);
  }
  restoreViewStyles(view) {
    if (!view) {
      return;
    }
    view.style['touchAction'] = 'auto';
    // @ts-ignore Turns on default touch behavior on Safari
    view.style['WebkitTouchCallout'] = 'auto';
  }
  onPointerDown(event) {
    this.tracker.addToTracker(event);
    super.onPointerDown(event);
    this.newPointerAction();
  }
  onPointerAdd(event) {
    this.tracker.addToTracker(event);
    super.onPointerAdd(event);
    this.newPointerAction();
  }
  newPointerAction() {
    const lastCoords = this.tracker.getAbsoluteCoordsAverage();
    this.startX = lastCoords.x;
    this.startY = lastCoords.y;
    if (this.state !== State.UNDETERMINED) {
      return;
    }
    this.begin();
    dispatchGestureLifecycleEvent(this.delegate.view, GestureLifecycleEvent.Began);
    const view = this.delegate.view;
    const isRNGHText = view.hasAttribute('rnghtext');
    if (this.role === NativeGestureRole.Button && this.shouldActivateOnStart || this.role === NativeGestureRole.Switch || isRNGHText) {
      this.activate();
    }
  }
  onPointerMove(event) {
    this.tracker.track(event);
    const lastCoords = this.tracker.getAbsoluteCoordsAverage();
    const dx = this.startX - lastCoords.x;
    const dy = this.startY - lastCoords.y;
    const distSq = dx * dx + dy * dy;
    if (this.role === NativeGestureRole.Switch || this.role === NativeGestureRole.Button) {
      return;
    }
    if (distSq >= this.minDistSq && this.state === State.BEGAN) {
      this.activate();
    }
  }
  onPointerLeave() {
    if (this.state === State.BEGAN || this.state === State.ACTIVE) {
      this.cancel();
    }
  }
  onPointerUp(event) {
    super.onPointerUp(event);
    this.onUp(event);
  }
  onPointerRemove(event) {
    super.onPointerRemove(event);
    this.onUp(event);
  }
  onUp(event) {
    this.tracker.removeFromTracker(event.pointerId);
    if (this.tracker.trackedPointersCount === 0) {
      if (this.role === NativeGestureRole.Button && this.state === State.BEGAN) {
        this.activate();
      }
      if (this.state === State.ACTIVE) {
        this.end();
      } else {
        this.fail();
      }
    }
  }
  shouldRecognizeSimultaneously(handler) {
    if (super.shouldRecognizeSimultaneously(handler)) {
      return true;
    }
    if (handler instanceof NativeViewGestureHandler && handler.state === State.ACTIVE && handler.disallowsInterruption() && !handler.yieldsToContinuousGestures) {
      return false;
    }
    const canBeInterrupted = !this.disallowInterruption || this.yieldsToContinuousGestures && handler.isContinuous;
    if (this.state === State.ACTIVE && handler.state === State.ACTIVE && canBeInterrupted) {
      return false;
    }
    return this.state === State.ACTIVE && canBeInterrupted && handler.handlerTag > 0;
  }
  detach() {
    super.detach();
    this.role = null;
  }
  shouldBeCancelledByOther(handler) {
    return !this.disallowInterruption || this.yieldsToContinuousGestures && handler.isContinuous;
  }
  shouldAttachGestureToChildView() {
    return true;
  }
  disallowsInterruption() {
    return this.disallowInterruption;
  }
  isButton() {
    return this.role === NativeGestureRole.Button;
  }
  shouldBeginWithRecordedHandlers(recorded) {
    if (!this.isButton()) {
      return true;
    }
    const self = this;
    return recorded.every(other => other.shouldRecognizeSimultaneously(self) || self.shouldRecognizeSimultaneously(other) || other.delegate.view === this.delegate.view || other.name === SingleGestureName.Hover);
  }
  onCancel() {
    super.onCancel();
    dispatchGestureLifecycleEvent(this.delegate.view, GestureLifecycleEvent.Canceled);
  }
  transformNativeEvent() {
    return {
      pointerInside: this.delegate.isPointerInBounds(this.tracker.getAbsoluteCoordsAverage())
    };
  }
  shouldSuppressActiveUpdate(handlerData) {
    if (this.lastActiveHandlerData && deepEqual(this.lastActiveHandlerData, handlerData)) {
      return true;
    }
    this.lastActiveHandlerData = handlerData;
    return false;
  }
  reset() {
    super.reset();
    this.lastActiveHandlerData = null;
  }
}
//# sourceMappingURL=NativeViewGestureHandler.js.map