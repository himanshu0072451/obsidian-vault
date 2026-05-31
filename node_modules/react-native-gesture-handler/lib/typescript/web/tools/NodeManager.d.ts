import type { ValueOf } from '../../typeUtils';
import type { Gestures } from '../Gestures';
import type IGestureHandler from '../handlers/IGestureHandler';
type HandlerReadyCallback = (handler: IGestureHandler) => void;
export default abstract class NodeManager {
    private static gestures;
    private static observers;
    static getHandler(tag: number): IGestureHandler;
    static hasHandler(tag: number): boolean;
    static createGestureHandler(handlerTag: number, handler: InstanceType<ValueOf<typeof Gestures>>): void;
    static dropGestureHandler(handlerTag: number): void;
    static detachGestureHandler(handlerTag: number): void;
    static observeHandler(tag: number, owner: object, callback: HandlerReadyCallback): void;
    static cancelObservation(tag: number, owner: object): void;
    static cancelAllObservationsForOwner(owner: object): void;
    static get nodes(): {
        [x: number]: import("../handlers/FlingGestureHandler").default | import("../handlers/HoverGestureHandler").default | import("../handlers/LongPressGestureHandler").default | import("../handlers/ManualGestureHandler").default | import("../handlers/NativeViewGestureHandler").default | import("../handlers/PanGestureHandler").default | import("../handlers/PinchGestureHandler").default | import("../handlers/RotationGestureHandler").default | import("../handlers/TapGestureHandler").default;
    };
}
export {};
//# sourceMappingURL=NodeManager.d.ts.map