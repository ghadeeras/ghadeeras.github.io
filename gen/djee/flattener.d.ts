export declare type Getter<S, P> = (structure: S) => P;
export declare type Setter<S, P> = (structure: S, primitive: P) => void;
export interface Flattener<S, P> {
    size: number;
    offsetOf<C>(child: Flattener<C, P>): number;
    flatten(structure: S, array?: P[], index?: number): P[];
    flattenAll(structures: S[], array?: P[], index?: number): P[];
    unflatten(structure: S, array: P[], index?: number): any;
}
export declare const flatteners: {
    composite: <S, C, P>(...flatteners: Flattener<S, P>[]) => Flattener<S, P>;
    primitive: <S_1, P_1>(getter: Getter<S_1, P_1>, setter: Setter<S_1, P_1>) => Flattener<S_1, P_1>;
    array: <S_2, P_2>(getter: Getter<S_2, P_2[]>, size: number) => Flattener<S_2, P_2>;
    child: <S_3, C_1, P_3>(getter: Getter<S_3, C_1>, flattener: Flattener<C_1, P_3>) => Flattener<S_3, P_3>;
};
//# sourceMappingURL=flattener.d.ts.map