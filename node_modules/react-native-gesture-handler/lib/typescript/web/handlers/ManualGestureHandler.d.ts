import type { AdaptedEvent } from '../interfaces';
import type { GestureHandlerDelegate } from '../tools/GestureHandlerDelegate';
import GestureHandler from './GestureHandler';
import type IGestureHandler from './IGestureHandler';
export default class ManualGestureHandler extends GestureHandler {
    readonly isContinuous = true;
    constructor(delegate: GestureHandlerDelegate<unknown, IGestureHandler>);
    protected onPointerDown(event: AdaptedEvent): void;
    protected onPointerAdd(event: AdaptedEvent): void;
    protected onPointerMove(event: AdaptedEvent): void;
    protected onPointerOutOfBounds(event: AdaptedEvent): void;
    protected onPointerUp(event: AdaptedEvent): void;
    protected onPointerRemove(event: AdaptedEvent): void;
}
//# sourceMappingURL=ManualGestureHandler.d.ts.map