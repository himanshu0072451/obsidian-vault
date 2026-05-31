import type { ActionType } from '../../ActionType';
import type { AdaptedEvent, PropsRef } from '../interfaces';
import type { GestureHandlerDelegate } from '../tools/GestureHandlerDelegate';
import GestureHandler from './GestureHandler';
import type IGestureHandler from './IGestureHandler';
export default class RotationGestureHandler extends GestureHandler {
    readonly isContinuous = true;
    private rotation;
    private velocity;
    private cachedAnchorX;
    private cachedAnchorY;
    private rotationGestureListener;
    private rotationGestureDetector;
    constructor(delegate: GestureHandlerDelegate<unknown, IGestureHandler>);
    init(ref: number, propsRef: React.RefObject<PropsRef>, actionType: ActionType): void;
    protected transformNativeEvent(): {
        rotation: number;
        anchorX: number;
        anchorY: number;
        velocity: number;
    };
    private getAnchor;
    protected onPointerDown(event: AdaptedEvent): void;
    protected onPointerAdd(event: AdaptedEvent): void;
    protected onPointerMove(event: AdaptedEvent): void;
    protected onPointerOutOfBounds(event: AdaptedEvent): void;
    protected onPointerUp(event: AdaptedEvent): void;
    protected onPointerRemove(event: AdaptedEvent): void;
    protected tryBegin(): void;
    protected onReset(): void;
}
//# sourceMappingURL=RotationGestureHandler.d.ts.map