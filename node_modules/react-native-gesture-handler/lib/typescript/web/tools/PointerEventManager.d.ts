import type { AdaptedEvent } from '../interfaces';
import { EventTypes } from '../interfaces';
import EventManager from './EventManager';
export default class PointerEventManager extends EventManager<HTMLElement> {
    private trackedPointers;
    private lastPosition;
    private shouldSendHoverEvents;
    constructor(view: HTMLElement, shouldSendHoverEvents: boolean);
    private pointerDownCallback;
    private pointerUpCallback;
    private pointerMoveCallback;
    private pointerCancelCallback;
    private pointerEnterCallback;
    private pointerLeaveCallback;
    private lostPointerCaptureCallback;
    registerListeners(): void;
    unregisterListeners(): void;
    protected mapEvent(event: PointerEvent, eventType: EventTypes): AdaptedEvent;
    resetManager(): void;
}
//# sourceMappingURL=PointerEventManager.d.ts.map