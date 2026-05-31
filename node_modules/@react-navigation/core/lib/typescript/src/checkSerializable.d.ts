type Result = {
    serializable: true;
} | {
    serializable: false;
    location: (string | number)[];
    reason: string;
};
export declare function checkSerializable(o: {
    [key: string]: any;
}): Result;
export {};
//# sourceMappingURL=checkSerializable.d.ts.map