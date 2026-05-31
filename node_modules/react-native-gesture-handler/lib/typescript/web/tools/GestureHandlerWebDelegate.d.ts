import type IGestureHandler from '../handlers/IGestureHandler';
import type { GestureHandlerDelegate, MeasureResult } from './GestureHandlerDelegate';
export declare class GestureHandlerWebDelegate implements GestureHandlerDelegate<HTMLElement, IGestureHandler> {
    private isInitialized;
    private _view;
    private gestureHandler;
    private eventManagers;
    private defaultViewStyles;
    private areContextMenuListenersAdded;
    private wasContextMenuEnabled;
    init(viewRef: number, handler: IGestureHandler): void;
    detach(): void;
    restoreDefaultViewStyles(): void;
    updateDOM(): void;
    isPointerInBounds({ x, y }: {
        x: number;
        y: number;
    }): boolean;
    measureView(): MeasureResult;
    absoluteToLocal(absoluteX: number, absoluteY: number): {
        x: number;
        y: number;
    };
    reset(): void;
    tryResetCursor(): void;
    private shouldDisableContextMenu;
    private addContextMenuListeners;
    private removeContextMenuListeners;
    private disableContextMenu;
    private enableContextMenu;
    private setUserSelect;
    private setTouchAction;
    private setContextMenu;
    onEnabledChange(): void;
    onBegin(): void;
    onActivate(): void;
    onEnd(): void;
    onCancel(): void;
    onFail(): void;
    destroy(): void;
    private setViewStyle;
    private ensureView;
    get view(): HTMLElement | null;
    set view(value: HTMLElement);
    get initialized(): boolean;
}
//# sourceMappingURL=GestureHandlerWebDelegate.d.ts.map