import React from 'react';
import { GestureDetectorType } from './detectors';
import type { NativeWrapperProperties, WrapperSpecificProperties } from './types/NativeWrapperType';
export default function createNativeWrapper<TRef = unknown, TProps = unknown>(Component: React.ComponentType<TProps>, config?: Readonly<Omit<NativeWrapperProperties<TRef>, keyof WrapperSpecificProperties<TRef>>>, detectorType?: GestureDetectorType): {
    (props: TProps & NativeWrapperProperties<TRef | null>): React.JSX.Element;
    displayName: any;
};
//# sourceMappingURL=createNativeWrapper.d.ts.map