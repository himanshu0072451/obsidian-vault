"use strict";

/* eslint-disable @typescript-eslint/no-empty-function */
import { ActionType } from '../../ActionType';
import { MouseButton } from '../../handlers/gestureHandlerCommon';
import { PointerType } from '../../PointerType';
import { State } from '../../State';
import { TouchEventType } from '../../TouchEventType';
import { tagMessage } from '../../utils';
import { EventTypes } from '../interfaces';
import GestureHandlerOrchestrator from '../tools/GestureHandlerOrchestrator';
import InteractionManager from '../tools/InteractionManager';
import PointerTracker from '../tools/PointerTracker';
export default class GestureHandler {
  lastSentState = null;
  _state = State.UNDETERMINED;
  _shouldCancelWhenOutside = false;
  _enabled = null;
  viewRef = null;
  propsRef = null;
  actionType = null;
  forAnimated = false;
  forReanimated = false;
  _testID = undefined;
  hitSlop = undefined;
  manualActivation = false;
  mouseButton = undefined;
  needsPointerData = false;
  _tracker = new PointerTracker();
  _enableContextMenu = false;
  _activeCursor = undefined;
  _touchAction = undefined;
  _userSelect = undefined;

  // Orchestrator properties
  _activationIndex = 0;
  _awaiting = false;
  _active = false;
  _attached = false;
  _shouldResetProgress = false;
  _pointerType = PointerType.MOUSE;
  constructor(delegate) {
    this._delegate = delegate;
  }

  //
  // Initializing handler
  //

  init(viewRef, propsRef, actionType) {
    this.attached = true;
    this.propsRef = propsRef;
    this.viewRef = viewRef;
    this.actionType = actionType;
    this.state = State.UNDETERMINED;
    this.delegate.init(viewRef, this);
  }
  usesNativeOrVirtualDetector() {
    return this.actionType === ActionType.NATIVE_DETECTOR || this.actionType === ActionType.VIRTUAL_DETECTOR;
  }
  detach() {
    if (this.state === State.ACTIVE) {
      this.cancel();
    } else {
      this.fail();
    }
    this.propsRef = null;
    this.viewRef = null;
    this.actionType = null;
    this.state = State.UNDETERMINED;
    this.forAnimated = false;
    this.forReanimated = false;
    this.attached = false;
    this.delegate.detach();
  }
  attachEventManager(manager) {
    manager.setOnPointerDown(this.onPointerDown.bind(this));
    manager.setOnPointerAdd(this.onPointerAdd.bind(this));
    manager.setOnPointerUp(this.onPointerUp.bind(this));
    manager.setOnPointerRemove(this.onPointerRemove.bind(this));
    manager.setOnPointerMove(this.onPointerMove.bind(this));
    manager.setOnPointerEnter(this.onPointerEnter.bind(this));
    manager.setOnPointerLeave(this.onPointerLeave.bind(this));
    manager.setOnPointerCancel(this.onPointerCancel.bind(this));
    manager.setOnPointerOutOfBounds(this.onPointerOutOfBounds.bind(this));
    manager.setOnPointerMoveOver(this.onPointerMoveOver.bind(this));
    manager.setOnPointerMoveOut(this.onPointerMoveOut.bind(this));
    manager.setOnWheel(this.onWheel.bind(this));
    manager.registerListeners();
  }

  //
  // Resetting handler
  //

  onCancel() {}
  onReset() {}
  resetProgress() {}
  reset() {
    this.tracker.resetTracker();
    this.onReset();
    this.resetProgress();
    this.delegate.reset();
    this.state = State.UNDETERMINED;
  }

  //
  // State logic
  //

  moveToState(newState, sendIfDisabled) {
    if (this.state === newState) {
      return;
    }
    const oldState = this.state;
    this.state = newState;
    if (this.tracker.trackedPointersCount > 0 && this.needsPointerData && this.isFinished()) {
      this.cancelTouches();
    }
    GestureHandlerOrchestrator.instance.onHandlerStateChange(this, newState, oldState, sendIfDisabled);
    this.onStateChange(newState, oldState);
    if (!this.enabled && this.isFinished()) {
      this.state = State.UNDETERMINED;
    }
  }
  onStateChange(_newState, _oldState) {}
  begin() {
    if (!this.checkHitSlop()) {
      return;
    }
    if (this.state === State.UNDETERMINED) {
      this.moveToState(State.BEGAN);
    }
  }

  /**
   * @param {boolean} sendIfDisabled - Used when handler becomes disabled. With this flag orchestrator will be forced to send fail event
   */
  fail(sendIfDisabled) {
    if (this.state === State.ACTIVE || this.state === State.BEGAN) {
      // Here the order of calling the delegate and moveToState is important.
      // At this point we can use currentState as previuos state, because immediately after changing cursor we call moveToState method.
      this.delegate.onFail();
      this.moveToState(State.FAILED, sendIfDisabled);
    }
    this.resetProgress();
  }

  /**
   * @param {boolean} sendIfDisabled - Used when handler becomes disabled. With this flag orchestrator will be forced to send cancel event
   */
  cancel(sendIfDisabled) {
    if (this.state === State.ACTIVE || this.state === State.UNDETERMINED || this.state === State.BEGAN) {
      this.onCancel();

      // Same as above - order matters
      this.delegate.onCancel();
      this.moveToState(State.CANCELLED, sendIfDisabled);
    }
  }
  activate(force = false) {
    if ((this.manualActivation !== true || force) && this.state === State.BEGAN) {
      this.delegate.onActivate();
      this.moveToState(State.ACTIVE);
    }
  }
  end() {
    if (this.state === State.BEGAN || this.state === State.ACTIVE) {
      // Same as above - order matters
      this.delegate.onEnd();
      this.moveToState(State.END);
    }
    this.resetProgress();
  }

  //
  // Methods for orchestrator
  //

  getShouldResetProgress() {
    return this.shouldResetProgress;
  }
  setShouldResetProgress(value) {
    this.shouldResetProgress = value;
  }
  shouldWaitForHandlerFailure(handler) {
    if (handler === this) {
      return false;
    }
    return InteractionManager.instance.shouldWaitForHandlerFailure(this, handler);
  }
  shouldRequireToWaitForFailure(handler) {
    if (handler === this) {
      return false;
    }
    return InteractionManager.instance.shouldRequireHandlerToWaitForFailure(this, handler);
  }
  shouldRecognizeSimultaneously(handler) {
    if (handler === this) {
      return true;
    }
    return InteractionManager.instance.shouldRecognizeSimultaneously(this, handler);
  }
  shouldBeCancelledByOther(handler) {
    if (handler === this) {
      return false;
    }
    return InteractionManager.instance.shouldHandlerBeCancelledBy(this, handler);
  }
  shouldBeginWithRecordedHandlers(_recorded) {
    return true;
  }
  shouldAttachGestureToChildView() {
    return false;
  }

  //
  // Event actions
  //

  onPointerDown(event) {
    GestureHandlerOrchestrator.instance.recordHandlerIfNotPresent(this);
    this._pointerType = event.pointerType;
    if (this.pointerType === PointerType.TOUCH) {
      GestureHandlerOrchestrator.instance.cancelMouseAndPenGestures(this);
    }
    this.tryToSendTouchEvent(event);
  }
  // Adding another pointer to existing ones
  onPointerAdd(event) {
    this.tryToSendTouchEvent(event);
  }
  onPointerUp(event) {
    this.tryToSendTouchEvent(event);
  }
  // Removing pointer, when there is more than one pointers
  onPointerRemove(event) {
    this.tryToSendTouchEvent(event);
  }
  onPointerMove(event) {
    this.tryToSendMoveEvent(false, event);
  }
  onPointerLeave(event) {
    if (this.shouldCancelWhenOutside) {
      switch (this.state) {
        case State.ACTIVE:
          this.cancel();
          break;
        case State.BEGAN:
          this.fail();
          break;
      }
      return;
    }
    this.tryToSendTouchEvent(event);
  }
  onPointerEnter(event) {
    this.tryToSendTouchEvent(event);
  }
  onPointerCancel(_event) {
    // No need to send a cancel touch event explicitly here. `cancel` will
    // handle cancelling all tracked touches if the handler expects pointer data.
    if (GestureHandlerOrchestrator.instance.isHandlerRecorded(this)) {
      this.cancel();
    }
  }
  onPointerOutOfBounds(event) {
    this.tryToSendMoveEvent(true, event);
  }
  onPointerMoveOver(_event) {
    // Used only by hover gesture handler atm
  }
  onPointerMoveOut(_event) {
    // Used only by hover gesture handler atm
  }
  onWheel(_event) {
    // Used only by pan gesture handler
  }
  tryToSendMoveEvent(out, event) {
    if (out && this.shouldCancelWhenOutside || !this.enabled) {
      return;
    }
    this.tryToSendTouchEvent(event);
    if (this.active) {
      this.sendEvent(this.state, this.state);
    }
  }
  tryToSendTouchEvent(event) {
    if (this.needsPointerData) {
      this.sendTouchEvent(event);
    }
  }
  sendTouchEvent(event) {
    if (!this.enabled) {
      return;
    }
    this.ensurePropsRef();
    const {
      onGestureHandlerEvent,
      onGestureHandlerTouchEvent,
      onGestureHandlerReanimatedTouchEvent
    } = this.propsRef.current;
    const touchEvent = this.transformTouchEvent(event);
    if (!touchEvent) {
      return;
    }
    if (!this.usesNativeOrVirtualDetector()) {
      onGestureHandlerEvent?.(touchEvent);
      return;
    }
    if (this.forReanimated) {
      onGestureHandlerReanimatedTouchEvent?.(touchEvent);
    } else {
      onGestureHandlerTouchEvent?.(touchEvent);
    }
  }

  //
  // Events Sending
  //

  sendEvent = (newState, oldState) => {
    const {
      onGestureHandlerEvent,
      onGestureHandlerStateChange,
      onGestureHandlerAnimatedEvent,
      onGestureHandlerReanimatedEvent,
      onGestureHandlerReanimatedStateChange
    } = this.propsRef.current;
    const isStateChange = this.lastSentState !== newState;
    const resultEvent = !this.usesNativeOrVirtualDetector() ? this.transformEventData(newState, oldState) : isStateChange ? this.transformStateChangeEvent(newState, oldState) : this.transformUpdateEvent(newState);

    // In the v2 API oldState field has to be undefined, unless we send event state changed
    // Here the order is flipped to avoid workarounds such as making backup of the state and setting it to undefined first, then changing it back
    // Flipping order with setting oldState to undefined solves issue, when events were being sent twice instead of once
    // However, this may cause trouble in the future (but for now we don't know that)
    if (isStateChange) {
      this.lastSentState = newState;
      if (this.forReanimated) {
        onGestureHandlerReanimatedStateChange?.(resultEvent);
      } else {
        onGestureHandlerStateChange?.(resultEvent);
      }
    }
    if (this.state !== State.ACTIVE) {
      return;
    }

    // Cover only V3 path due to different event shape
    if (!isStateChange && this.usesNativeOrVirtualDetector()) {
      const handlerData = resultEvent.nativeEvent.handlerData;
      if (this.shouldSuppressActiveUpdate(handlerData)) {
        return;
      }
    }
    resultEvent.nativeEvent.oldState = undefined;
    if (this.forReanimated) {
      onGestureHandlerReanimatedEvent?.(resultEvent);
    } else if (this.forAnimated) {
      onGestureHandlerAnimatedEvent?.(resultEvent);
    } else {
      onGestureHandlerEvent?.(resultEvent);
    }
  };
  shouldSuppressActiveUpdate(_handlerData) {
    return false;
  }
  transformEventData(newState, oldState) {
    this.ensureViewRef(this.viewRef);
    return {
      nativeEvent: {
        numberOfPointers: this.tracker.trackedPointersCount,
        state: newState,
        ...this.transformNativeEvent(),
        handlerTag: this.handlerTag,
        oldState: newState !== oldState ? oldState : undefined,
        pointerType: this.pointerType
      },
      timeStamp: Date.now()
    };
  }
  transformStateChangeEvent(newState, oldState) {
    this.ensureViewRef(this.viewRef);
    return {
      nativeEvent: {
        state: newState,
        handlerTag: this.handlerTag,
        oldState: oldState,
        handlerData: {
          numberOfPointers: this.tracker.trackedPointersCount,
          pointerType: this.pointerType,
          ...this.transformNativeEvent()
        }
      },
      timeStamp: Date.now()
    };
  }
  transformUpdateEvent(newState) {
    this.ensureViewRef(this.viewRef);
    return {
      nativeEvent: {
        state: newState,
        handlerTag: this.handlerTag,
        handlerData: {
          pointerType: this.pointerType,
          numberOfPointers: this.tracker.trackedPointersCount,
          ...this.transformNativeEvent()
        }
      },
      timeStamp: Date.now()
    };
  }
  transformTouchEvent(event) {
    const rect = this.delegate.measureView();
    const all = [];
    const changed = [];
    const trackerData = this.tracker.trackedPointers;

    // This if handles edge case where all pointers have been cancelled
    // When pointercancel is triggered, reset method is called. This means that tracker will be reset after first pointer being cancelled
    // The problem is, that handler will receive another pointercancel event from the rest of the pointers
    // To avoid crashing, we don't send event if tracker tracks no pointers, i.e. has been reset
    if (trackerData.size === 0 || !trackerData.has(event.pointerId)) {
      return;
    }
    trackerData.forEach((element, key) => {
      const id = this.tracker.getMappedTouchEventId(key);
      all.push({
        id: id,
        x: element.abosoluteCoords.x - rect.pageX,
        y: element.abosoluteCoords.y - rect.pageY,
        absoluteX: element.abosoluteCoords.x,
        absoluteY: element.abosoluteCoords.y
      });
    });

    // Each pointer sends its own event, so we want changed touches to contain only the pointer that has changed.
    // However, if the event is cancel, we want to cancel all pointers to avoid crashes
    if (event.eventType !== EventTypes.CANCEL) {
      changed.push({
        id: this.tracker.getMappedTouchEventId(event.pointerId),
        x: event.x - rect.pageX,
        y: event.y - rect.pageY,
        absoluteX: event.x,
        absoluteY: event.y
      });
    } else {
      trackerData.forEach((element, key) => {
        const id = this.tracker.getMappedTouchEventId(key);
        changed.push({
          id: id,
          x: element.abosoluteCoords.x - rect.pageX,
          y: element.abosoluteCoords.y - rect.pageY,
          absoluteX: element.abosoluteCoords.x,
          absoluteY: element.abosoluteCoords.y
        });
      });
    }
    let eventType = TouchEventType.UNDETERMINED;
    switch (event.eventType) {
      case EventTypes.DOWN:
      case EventTypes.ADDITIONAL_POINTER_DOWN:
        eventType = TouchEventType.TOUCHES_DOWN;
        break;
      case EventTypes.UP:
      case EventTypes.ADDITIONAL_POINTER_UP:
        eventType = TouchEventType.TOUCHES_UP;
        break;
      case EventTypes.MOVE:
        eventType = TouchEventType.TOUCHES_MOVE;
        break;
      case EventTypes.CANCEL:
        eventType = TouchEventType.TOUCHES_CANCEL;
        break;
    }

    // Here, when we receive up event, we want to decrease number of touches
    // That's because we want handler to send information that there's one pointer less
    // However, we still want this pointer to be present in allTouches array, so that its data can be accessed
    let numberOfTouches = all.length;
    if (event.eventType === EventTypes.UP || event.eventType === EventTypes.ADDITIONAL_POINTER_UP) {
      --numberOfTouches;
    }
    return {
      nativeEvent: {
        handlerTag: this.handlerTag,
        state: this.state,
        eventType: eventType,
        changedTouches: changed,
        allTouches: all,
        numberOfTouches: numberOfTouches,
        pointerType: this.pointerType
      },
      timeStamp: Date.now()
    };
  }
  cancelTouches() {
    this.ensurePropsRef();
    const rect = this.delegate.measureView();
    const all = [];
    const changed = [];
    const trackerData = this.tracker.trackedPointers;
    if (trackerData.size === 0) {
      return;
    }
    trackerData.forEach((element, key) => {
      const id = this.tracker.getMappedTouchEventId(key);
      all.push({
        id: id,
        x: element.abosoluteCoords.x - rect.pageX,
        y: element.abosoluteCoords.y - rect.pageY,
        absoluteX: element.abosoluteCoords.x,
        absoluteY: element.abosoluteCoords.y
      });
      changed.push({
        id: id,
        x: element.abosoluteCoords.x - rect.pageX,
        y: element.abosoluteCoords.y - rect.pageY,
        absoluteX: element.abosoluteCoords.x,
        absoluteY: element.abosoluteCoords.y
      });
    });
    const cancelEvent = {
      nativeEvent: {
        handlerTag: this.handlerTag,
        state: this.state,
        eventType: TouchEventType.TOUCHES_CANCEL,
        changedTouches: changed,
        allTouches: all,
        numberOfTouches: all.length,
        pointerType: this.pointerType
      },
      timeStamp: Date.now()
    };
    const {
      onGestureHandlerEvent,
      onGestureHandlerReanimatedTouchEvent,
      onGestureHandlerTouchEvent
    } = this.propsRef.current;
    if (this.actionType !== ActionType.NATIVE_DETECTOR) {
      onGestureHandlerEvent?.(cancelEvent);
      return;
    }
    if (this.forReanimated) {
      onGestureHandlerReanimatedTouchEvent?.(cancelEvent);
    } else {
      onGestureHandlerTouchEvent?.(cancelEvent);
    }
  }
  ensurePropsRef() {
    if (!this.propsRef) {
      throw new Error(tagMessage('Cannot handle event when component props are null'));
    }
  }
  ensureViewRef(viewRef) {
    if (!viewRef) {
      throw new Error(tagMessage('Cannot handle event when target is null'));
    }
  }
  transformNativeEvent() {
    // Those properties are shared by most handlers and if not this method will be overriden
    const lastCoords = this.tracker.getAbsoluteCoordsAverage();
    const lastRelativeCoords = this.tracker.getRelativeCoordsAverage();
    return {
      x: lastRelativeCoords.x,
      y: lastRelativeCoords.y,
      absoluteX: lastCoords.x,
      absoluteY: lastCoords.y
    };
  }

  //
  // Handling config
  //

  // Helper function to correctly set enabled property
  maybeUpdateEnabled(enabled) {
    if (enabled === undefined) {
      if (this._enabled !== null) {
        return false;
      }
      this._enabled = true;
      return true;
    }
    const prevEnabled = this._enabled;
    this._enabled = enabled;
    return enabled !== prevEnabled;
  }
  setGestureConfig(config) {
    this.resetConfig();
    this.updateGestureConfig(config);
  }
  updateGestureConfig(config) {
    const enabledChanged = this.maybeUpdateEnabled(config.enabled);
    if (config.hitSlop !== undefined) {
      this.hitSlop = config.hitSlop;
      this.validateHitSlops();
    }
    if (config.testID !== undefined) {
      this._testID = config.testID;
    }
    if (config.dispatchesAnimatedEvents !== undefined) {
      this.forAnimated = config.dispatchesAnimatedEvents;
    }
    if (config.dispatchesReanimatedEvents !== undefined) {
      this.forReanimated = config.dispatchesReanimatedEvents;
    }
    if (config.manualActivation !== undefined) {
      this.manualActivation = config.manualActivation;
    }
    if (config.mouseButton !== undefined) {
      this.mouseButton = config.mouseButton;
    }
    if (config.needsPointerData !== undefined) {
      this.needsPointerData = config.needsPointerData;
    }
    if (config.shouldCancelWhenOutside !== undefined) {
      this.shouldCancelWhenOutside = config.shouldCancelWhenOutside;
    }
    if (config.activeCursor !== undefined) {
      this._activeCursor = config.activeCursor;
    }
    let shouldUpdateDOM = false;
    if (config.enableContextMenu !== undefined) {
      this.enableContextMenu = config.enableContextMenu;
      shouldUpdateDOM = true;
    }
    if (config.touchAction !== undefined) {
      this._touchAction = config.touchAction;
      shouldUpdateDOM = true;
    }
    if (config.userSelect !== undefined) {
      this._userSelect = config.userSelect;
      shouldUpdateDOM = true;
    }
    if (enabledChanged) {
      this.delegate.onEnabledChange();
    } else if (shouldUpdateDOM) {
      this.delegate.updateDOM();
    }
    if (this.enabled) {
      return;
    }
    switch (this.state) {
      case State.ACTIVE:
        this.fail(true);
        break;
      case State.UNDETERMINED:
        GestureHandlerOrchestrator.instance.removeHandlerFromOrchestrator(this);
        break;
      default:
        this.cancel(true);
        break;
    }
  }
  validateHitSlops() {
    if (!this.hitSlop) {
      return;
    }
    if (this.hitSlop.left !== undefined && this.hitSlop.right !== undefined && this.hitSlop.width !== undefined) {
      throw new Error('HitSlop Error: Cannot define left, right and width at the same time');
    }
    if (this.hitSlop.width !== undefined && this.hitSlop.left === undefined && this.hitSlop.right === undefined) {
      throw new Error('HitSlop Error: When width is defined, either left or right has to be defined');
    }
    if (this.hitSlop.height !== undefined && this.hitSlop.top !== undefined && this.hitSlop.bottom !== undefined) {
      throw new Error('HitSlop Error: Cannot define top, bottom and height at the same time');
    }
    if (this.hitSlop.height !== undefined && this.hitSlop.top === undefined && this.hitSlop.bottom === undefined) {
      throw new Error('HitSlop Error: When height is defined, either top or bottom has to be defined');
    }
  }
  checkHitSlop() {
    if (!this.hitSlop) {
      return true;
    }
    const {
      width,
      height
    } = this.delegate.measureView();
    let left = 0;
    let top = 0;
    let right = width;
    let bottom = height;
    if (this.hitSlop.horizontal !== undefined) {
      left -= this.hitSlop.horizontal;
      right += this.hitSlop.horizontal;
    }
    if (this.hitSlop.vertical !== undefined) {
      top -= this.hitSlop.vertical;
      bottom += this.hitSlop.vertical;
    }
    if (this.hitSlop.left !== undefined) {
      left = -this.hitSlop.left;
    }
    if (this.hitSlop.right !== undefined) {
      right = width + this.hitSlop.right;
    }
    if (this.hitSlop.top !== undefined) {
      top = -this.hitSlop.top;
    }
    if (this.hitSlop.bottom !== undefined) {
      bottom = height + this.hitSlop.bottom;
    }
    if (this.hitSlop.width !== undefined) {
      if (this.hitSlop.left !== undefined) {
        right = left + this.hitSlop.width;
      } else if (this.hitSlop.right !== undefined) {
        left = right - this.hitSlop.width;
      }
    }
    if (this.hitSlop.height !== undefined) {
      if (this.hitSlop.top !== undefined) {
        bottom = top + this.hitSlop.height;
      } else if (this.hitSlop.bottom !== undefined) {
        top = bottom - this.hitSlop.height;
      }
    }
    const rect = this.delegate.measureView();
    const lastCoords = this.tracker.getLastAbsoluteCoords();
    if (!lastCoords) {
      return false;
    }
    const offsetX = lastCoords.x - rect.pageX;
    const offsetY = lastCoords.y - rect.pageY;
    return offsetX >= left && offsetX <= right && offsetY >= top && offsetY <= bottom;
  }
  isButtonInConfig(mouseButton) {
    return !mouseButton || !this.mouseButton && mouseButton === MouseButton.LEFT || this.mouseButton && mouseButton & this.mouseButton;
  }
  resetConfig() {
    this._testID = undefined;
    this.manualActivation = false;
    this.shouldCancelWhenOutside = false;
    this.mouseButton = undefined;
    this.hitSlop = undefined;
    this.needsPointerData = false;
    this.forAnimated = false;
    this.forReanimated = false;
    this.enableContextMenu = false;
    this._activeCursor = undefined;
    this._touchAction = undefined;
    this._userSelect = undefined;
  }
  onDestroy() {
    GestureHandlerOrchestrator.instance.removeHandlerFromOrchestrator(this);
    this.delegate.destroy();
  }

  //
  // Getters and setters
  //

  get handlerTag() {
    return this._handlerTag;
  }
  set handlerTag(value) {
    this._handlerTag = value;
  }
  get testID() {
    return this._testID;
  }
  get delegate() {
    return this._delegate;
  }
  get tracker() {
    return this._tracker;
  }
  get state() {
    return this._state;
  }
  set state(value) {
    this._state = value;
  }
  get shouldCancelWhenOutside() {
    return this._shouldCancelWhenOutside;
  }
  set shouldCancelWhenOutside(value) {
    this._shouldCancelWhenOutside = value;
  }
  get enabled() {
    return this._enabled;
  }
  get pointerType() {
    return this._pointerType;
  }
  get active() {
    return this._active;
  }
  set active(value) {
    this._active = value;
  }
  get awaiting() {
    return this._awaiting;
  }
  set awaiting(value) {
    this._awaiting = value;
  }
  get attached() {
    return this._attached;
  }
  set attached(value) {
    this._attached = value;
  }
  get activationIndex() {
    return this._activationIndex;
  }
  set activationIndex(value) {
    this._activationIndex = value;
  }
  get shouldResetProgress() {
    return this._shouldResetProgress;
  }
  set shouldResetProgress(value) {
    this._shouldResetProgress = value;
  }
  get enableContextMenu() {
    return this._enableContextMenu;
  }
  set enableContextMenu(value) {
    this._enableContextMenu = value;
  }
  get activeCursor() {
    return this._activeCursor;
  }
  get touchAction() {
    return this._touchAction;
  }
  get userSelect() {
    return this._userSelect;
  }
  get name() {
    return this._name;
  }
  set name(value) {
    this._name = value;
  }

  /**
   * Whether the handler represents a continuous gesture rather than a discrete one.
   */
  isContinuous = false;
  getTrackedPointersID() {
    return this.tracker.trackedPointersIDs;
  }
  isFinished() {
    return this.state === State.END || this.state === State.FAILED || this.state === State.CANCELLED;
  }
}
//# sourceMappingURL=GestureHandler.js.map