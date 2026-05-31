import React from 'react';
import type { ActionType } from './ActionType';
import type { GestureRelations } from './v3/types';
import { Gestures } from './web/Gestures';
import type { Config, PropsRef } from './web/interfaces';
declare const _default: {
    createGestureHandler<T>(handlerName: keyof typeof Gestures, handlerTag: number, config: T): void;
    attachGestureHandler(handlerTag: number, newView: any, actionType: ActionType, propsRef: React.RefObject<PropsRef>): void;
    detachGestureHandler(handlerTag: number): void;
    setGestureHandlerConfig(handlerTag: number, newConfig: Config): void;
    updateGestureHandlerConfig(handlerTag: number, newConfig: Partial<Config>): void;
    getGestureHandlerNode(handlerTag: number): import("./web/handlers/IGestureHandler").default;
    dropGestureHandler(handlerTag: number): void;
    configureRelations(handlerTag: number, relations: GestureRelations): void;
    flushOperations(): void;
    installUIRuntimeBindings(): boolean;
};
export default _default;
//# sourceMappingURL=RNGestureHandlerModule.web.d.ts.map