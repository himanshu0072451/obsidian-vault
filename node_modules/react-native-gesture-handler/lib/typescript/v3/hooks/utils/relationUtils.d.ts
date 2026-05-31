import type { ComposedGesture, ExternalRelations, Gesture, GestureRelations } from '../../types';
export declare function isComposedGesture<TConfig, THandlerData>(gesture: Gesture<TConfig, THandlerData> | ComposedGesture): gesture is ComposedGesture;
export declare function prepareRelations(relations: ExternalRelations, handlerTag: number): GestureRelations;
export declare function containsDuplicates(tags: number[]): boolean;
//# sourceMappingURL=relationUtils.d.ts.map