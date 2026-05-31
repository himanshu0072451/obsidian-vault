import type React from 'react';
import type { ActionType } from './ActionType';
import FlingGestureHandler from './web/handlers/FlingGestureHandler';
import LongPressGestureHandler from './web/handlers/LongPressGestureHandler';
import ManualGestureHandler from './web/handlers/ManualGestureHandler';
import NativeViewGestureHandler from './web/handlers/NativeViewGestureHandler';
import PanGestureHandler from './web/handlers/PanGestureHandler';
import PinchGestureHandler from './web/handlers/PinchGestureHandler';
import RotationGestureHandler from './web/handlers/RotationGestureHandler';
import TapGestureHandler from './web/handlers/TapGestureHandler';
import type { Config } from './web/interfaces';
export declare const Gestures: {
    NativeViewGestureHandler: typeof NativeViewGestureHandler;
    PanGestureHandler: typeof PanGestureHandler;
    TapGestureHandler: typeof TapGestureHandler;
    LongPressGestureHandler: typeof LongPressGestureHandler;
    PinchGestureHandler: typeof PinchGestureHandler;
    RotationGestureHandler: typeof RotationGestureHandler;
    FlingGestureHandler: typeof FlingGestureHandler;
    ManualGestureHandler: typeof ManualGestureHandler;
};
declare const _default: {
    createGestureHandler<T>(_handlerName: keyof typeof Gestures, _handlerTag: number, _config: T): void;
    attachGestureHandler(_handlerTag: number, _newView: any, _actionType: ActionType, _propsRef: React.RefObject<unknown>): void;
    setGestureHandlerConfig(_handlerTag: number, _newConfig: Config): void;
    updateGestureHandlerConfig(_handlerTag: number, _newConfig: Config): void;
    getGestureHandlerNode(_handlerTag: number): void;
    dropGestureHandler(_handlerTag: number): void;
    flushOperations(): void;
};
export default _default;
//# sourceMappingURL=RNGestureHandlerModule.windows.d.ts.map