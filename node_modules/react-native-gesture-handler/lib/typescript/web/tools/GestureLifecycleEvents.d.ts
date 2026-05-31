export declare const GestureLifecycleEvent: {
    readonly Began: "gh:gestureBegan";
    readonly Canceled: "gh:gestureCanceled";
};
export type GestureLifecycleEventName = (typeof GestureLifecycleEvent)[keyof typeof GestureLifecycleEvent];
export declare function dispatchGestureLifecycleEvent(view: HTMLElement | null | undefined, name: GestureLifecycleEventName): void;
//# sourceMappingURL=GestureLifecycleEvents.d.ts.map