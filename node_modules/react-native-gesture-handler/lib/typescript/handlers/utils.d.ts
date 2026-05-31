import type * as React from 'react';
export declare const selectProperties: (obj: Record<string, unknown>, keys: string[]) => {
    [k: string]: unknown;
};
export declare function filterConfig(props: Record<string, unknown>, validProps: string[], defaults?: Record<string, unknown>): {
    [x: string]: unknown;
};
export declare function transformIntoHandlerTags(handlerIDs: any): any;
export declare function findNodeHandle(node: null | number | React.Component<any, any> | React.ComponentClass<any>): null | number | React.Component<any, any> | React.ComponentClass<any>;
export declare function scheduleFlushOperations(): void;
export declare function scheduleOperationToBeFlushed(operation: () => void): void;
//# sourceMappingURL=utils.d.ts.map