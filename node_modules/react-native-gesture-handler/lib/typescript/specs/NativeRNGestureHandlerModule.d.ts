import type { TurboModule } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
export interface Spec extends TurboModule {
    createGestureHandler: (handlerName: string, handlerTag: Double, config: Object) => void;
    attachGestureHandler: (handlerTag: Double, newView: Double, actionType: Double) => void;
    setGestureHandlerConfig: (handlerTag: Double, newConfig: Object) => void;
    updateGestureHandlerConfig: (handlerTag: Double, newConfig: Object) => void;
    configureRelations: (handlerTag: Double, relations: Object) => void;
    dropGestureHandler: (handlerTag: Double) => void;
    flushOperations: () => void;
    installUIRuntimeBindings: () => boolean;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeRNGestureHandlerModule.d.ts.map