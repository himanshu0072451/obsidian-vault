import type { AdaptedEvent } from '../interfaces';
import type { GestureHandlerDelegate } from '../tools/GestureHandlerDelegate';
import GestureHandler from './GestureHandler';
import type IGestureHandler from './IGestureHandler';
export default class HoverGestureHandler extends GestureHandler {
    readonly isContinuous = true;
    private stylusData;
    constructor(delegate: GestureHandlerDelegate<unknown, IGestureHandler>);
    protected transformNativeEvent(): Record<string, unknown>;
    protected onPointerMoveOver(event: AdaptedEvent): void;
    protected onPointerMoveOut(event: AdaptedEvent): void;
    protected onPointerMove(event: AdaptedEvent): void;
}
//# sourceMappingURL=HoverGestureHandler.d.ts.map