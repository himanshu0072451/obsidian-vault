import type { ActionType } from '../../ActionType';
import { State } from '../../State';
import type { AdaptedEvent, Config, PropsRef } from '../interfaces';
import type { GestureHandlerDelegate } from '../tools/GestureHandlerDelegate';
import GestureHandler from './GestureHandler';
import type IGestureHandler from './IGestureHandler';
export default class LongPressGestureHandler extends GestureHandler {
    private minDurationMs;
    private defaultMaxDistSq;
    private maxDistSq;
    private numberOfPointers;
    private startX;
    private startY;
    private startTime;
    private previousTime;
    private activationTimeout;
    constructor(delegate: GestureHandlerDelegate<unknown, IGestureHandler>);
    init(ref: number, propsRef: React.RefObject<PropsRef>, actionType: ActionType): void;
    protected transformNativeEvent(): {
        duration: number;
    };
    updateGestureConfig(config: Config): void;
    protected resetConfig(): void;
    protected onStateChange(_newState: State, _oldState: State): void;
    protected onPointerDown(event: AdaptedEvent): void;
    protected onPointerAdd(event: AdaptedEvent): void;
    protected onPointerMove(event: AdaptedEvent): void;
    protected onPointerOutOfBounds(event: AdaptedEvent): void;
    protected onPointerUp(event: AdaptedEvent): void;
    protected onPointerRemove(event: AdaptedEvent): void;
    private tryBegin;
    private tryActivate;
    private checkDistanceFail;
}
//# sourceMappingURL=LongPressGestureHandler.d.ts.map