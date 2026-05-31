export declare const Directions: {
    readonly RIGHT: 1;
    readonly LEFT: 2;
    readonly UP: 4;
    readonly DOWN: 8;
};
export declare const DiagonalDirections: {
    readonly UP_RIGHT: 5;
    readonly DOWN_RIGHT: 9;
    readonly UP_LEFT: 6;
    readonly DOWN_LEFT: 10;
};
export type Directions = (typeof Directions)[keyof typeof Directions];
export type DiagonalDirections = (typeof DiagonalDirections)[keyof typeof DiagonalDirections];
//# sourceMappingURL=Directions.d.ts.map