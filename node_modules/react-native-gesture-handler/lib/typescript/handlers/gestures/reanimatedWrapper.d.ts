import type { ComponentClass } from 'react';
import type { GestureCallbacks, GestureUpdateEventWithHandlerData, SharedValue } from '../../v3/types';
export type ReanimatedContext<THandlerData> = {
    lastUpdateEvent: GestureUpdateEventWithHandlerData<THandlerData> | undefined;
};
interface WorkletProps {
    __closure: unknown;
    __workletHash: number;
    __initData?: unknown;
    __init?: () => unknown;
    __stackDetails?: unknown;
    __pluginVersion?: string;
}
type WorkletFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> = ((...args: TArgs) => TReturn) & WorkletProps;
export type ReanimatedHandler<THandlerData> = {
    doDependenciesDiffer: boolean;
    context: ReanimatedContext<THandlerData>;
};
export type NativeEventsManager = new (component: {
    props: Record<string, unknown>;
    _componentRef: React.Ref<unknown>;
    _componentViewTag: number;
    getComponentViewTag: () => number;
}) => {
    attachEvents: () => void;
    detachEvents: () => void;
    updateEvents: (prevProps: Record<string, unknown>) => void;
};
declare let Reanimated: {
    default: {
        createAnimatedComponent<P extends object>(component: ComponentClass<P>, options?: unknown): ComponentClass<P>;
    };
    NativeEventsManager: NativeEventsManager;
    useHandler: <THandlerData, TExtendedHandlerData extends THandlerData>(handlers: GestureCallbacks<THandlerData, TExtendedHandlerData>) => ReanimatedHandler<TExtendedHandlerData>;
    useEvent: <T>(callback: (event: T) => void, events: string[], rebuild: boolean) => (event: unknown) => void;
    useSharedValue: <T>(value: T) => SharedValue<T>;
    setGestureState: (handlerTag: number, newState: number) => void;
    isSharedValue: <T = unknown>(value: unknown) => value is SharedValue<T>;
    isWorkletFunction<Args extends unknown[] = unknown[], ReturnValue = unknown>(value: unknown): value is WorkletFunction<Args, ReturnValue>;
    useComposedEventHandler<T>(handlers: (((event: T) => void) | null)[]): (event: T) => void;
    runOnUI<A extends any[], R>(fn: (...args: A) => R): (...args: Parameters<typeof fn>) => void;
} | undefined;
export { Reanimated };
//# sourceMappingURL=reanimatedWrapper.d.ts.map