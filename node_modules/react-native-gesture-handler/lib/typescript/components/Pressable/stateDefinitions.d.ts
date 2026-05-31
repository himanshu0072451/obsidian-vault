import type { PressableEvent } from './PressableProps';
import type { StateDefinition } from './StateMachine';
export declare enum StateMachineEvent {
    NATIVE_BEGIN = "nativeBegin",
    NATIVE_START = "nativeStart",
    FINALIZE = "finalize",
    LONG_PRESS_TOUCHES_DOWN = "longPressTouchesDown",
    CANCEL = "cancel"
}
export declare function getStatesConfig(handlePressIn: (event: PressableEvent) => void, handlePressOut: (event: PressableEvent) => void, screenReaderActive: boolean): StateDefinition[];
//# sourceMappingURL=stateDefinitions.d.ts.map