import type { AdaptedEvent } from '../interfaces';
import EventManager from './EventManager';
export default class WheelEventManager extends EventManager<HTMLElement> {
    private wheelDelta;
    private resetDelta;
    private wheelCallback;
    registerListeners(): void;
    unregisterListeners(): void;
    protected mapEvent(event: WheelEvent): AdaptedEvent;
    resetManager(): void;
}
//# sourceMappingURL=WheelEventManager.d.ts.map