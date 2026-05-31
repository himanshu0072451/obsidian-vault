import type { ActionType } from '../../ActionType';
import type { AdaptedEvent, PropsRef } from '../interfaces';
import type { GestureHandlerDelegate } from '../tools/GestureHandlerDelegate';
import GestureHandler from './GestureHandler';
import type IGestureHandler from './IGestureHandler';
export default class PinchGestureHandler extends GestureHandler {
    readonly isContinuous = true;
    private scale;
    private velocity;
    private startingSpan;
    private spanSlop;
    private scaleDetectorListener;
    private scaleGestureDetector;
    constructor(delegate: GestureHandlerDelegate<unknown, IGestureHandler>);
    init(ref: number, propsRef: React.RefObject<PropsRef>, actionType: ActionType): void;
    protected transformNativeEvent(): {
        focalX: number;
        focalY: number;
        velocity: number;
        scale: number;
    };
    protected onPointerDown(event: AdaptedEvent): void;
    protected onPointerAdd(event: AdaptedEvent): void;
    protected onPointerUp(event: AdaptedEvent): void;
    protected onPointerRemove(event: AdaptedEvent): void;
    protected onPointerMove(event: AdaptedEvent): void;
    protected onPointerOutOfBounds(event: AdaptedEvent): void;
    private tryBegin;
    activate(force?: boolean): void;
    protected onReset(): void;
    protected resetProgress(): void;
}
//# sourceMappingURL=PinchGestureHandler.d.ts.map