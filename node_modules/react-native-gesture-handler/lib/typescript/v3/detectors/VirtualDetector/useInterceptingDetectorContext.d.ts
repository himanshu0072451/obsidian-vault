import type { VirtualChild } from '../../types';
export declare enum InterceptingDetectorMode {
    DEFAULT = 0,
    ANIMATED = 1,
    REANIMATED = 2
}
export type InterceptingDetectorContextValue = {
    mode: InterceptingDetectorMode;
    setMode: (mode: InterceptingDetectorMode) => void;
    register: (child: VirtualChild) => void;
    unregister: (child: VirtualChild) => void;
};
export declare const InterceptingDetectorContext: import("react").Context<InterceptingDetectorContextValue | null>;
export declare function useInterceptingDetectorContext(): InterceptingDetectorContextValue | null;
//# sourceMappingURL=useInterceptingDetectorContext.d.ts.map