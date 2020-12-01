import * as Gear from "../gear/all.js";
import * as Space from "../space/all.js";
export interface FlattenedSierpinski {
    corners: number[];
    centers: number[];
    stride: number;
}
export declare function sierpinski(depth?: Gear.Source<number>, a?: Gear.Source<Space.Vector>, b?: Gear.Source<Space.Vector>, c?: Gear.Source<Space.Vector>): Gear.Source<FlattenedSierpinski>;
export declare function tesselatedTriangle(a: Space.Vector, b: Space.Vector, c: Space.Vector, depth: number): FlattenedSierpinski;
//# sourceMappingURL=model.d.ts.map