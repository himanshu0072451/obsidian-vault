import type { ViewProps } from 'react-native';
import type { Int32 } from 'react-native/Libraries/Types/CodegenTypes';
export interface RootViewNativeProps extends ViewProps {
    unstable_forceActive?: boolean;
}
interface NativeProps extends ViewProps {
    moduleId: Int32;
    unstable_forceActive?: boolean;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=RNGestureHandlerRootViewNativeComponent.d.ts.map