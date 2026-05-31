import type { AdaptedEvent, Config } from '../interfaces';
import type { GestureHandlerDelegate } from '../tools/GestureHandlerDelegate';
import GestureHandler from './GestureHandler';
import type IGestureHandler from './IGestureHandler';
export default class FlingGestureHandler extends GestureHandler {
    private numberOfPointersRequired;
    private direction;
    private maxDurationMs;
    private minVelocity;
    private delayTimeout;
    private maxNumberOfPointersSimultaneously;
    private keyPointer;
    constructor(delegate: GestureHandlerDelegate<unknown, IGestureHandler>);
    updateGestureConfig(config: Config): void;
    private startFling;
    private tryEndFling;
    private endFling;
    protected onPointerDown(event: AdaptedEvent): void;
    protected onPointerAdd(event: AdaptedEvent): void;
    private newPointerAction;
    private pointerMoveAction;
    protected onPointerMove(event: AdaptedEvent): void;
    protected onPointerOutOfBounds(event: AdaptedEvent): void;
    protected onPointerUp(event: AdaptedEvent): void;
    protected onPointerRemove(event: AdaptedEvent): void;
    private onUp;
    activate(force?: boolean): void;
    protected resetConfig(): void;
}
//# sourceMappingURL=FlingGestureHandler.d.ts.map