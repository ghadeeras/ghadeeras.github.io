import * as Gear from "../gear/all.js"
import * as Space from "../space/all.js"
import { Vec, vec2 } from "../space/all.js";

export interface FlattenedSierpinski {
    corners: number[];
    centers: number[];
    stride: number;
}

interface Sierpinski {
    depth: number;
    a: Vec<2>;
    b: Vec<2>;
    c: Vec<2>;
}

const defaultSierpinski: Sierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
}

export function sierpinski(
    depth: Gear.Source<number> = new Gear.Value(),
    a: Gear.Source<Vec<2>> = new Gear.Value(), 
    b: Gear.Source<Vec<2>> = new Gear.Value(), 
    c: Gear.Source<Vec<2>> = new Gear.Value(),
): Gear.Source<FlattenedSierpinski> {
    const sierpinski: Sierpinski = { ...defaultSierpinski }
    return from<Sierpinski>(
        from(depth).reduce((d, s) => s = {...s, depth :d}, sierpinski), 
        from(a).reduce((a, s) => s = {...s, a :a}, sierpinski), 
        from(b).reduce((b, s) => s = {...s, b :b}, sierpinski), 
        from(c).reduce((c, s) => s = {...s, c :c}, sierpinski) 
    ).map(s => tesselatedTriangle(s.a, s.b, s.c, s.depth));
}

function from<T>(...sources: Gear.Source<T>[]): Gear.Flow<T> {
    return Gear.Flow.from(...sources);
}

function vec(angleInDegrees: number): Vec<2> {
    const angle = Math.PI * angleInDegrees / 180
    return [Math.cos(angle), Math.sin(angle)];
}
    
export function tesselatedTriangle(a: Vec<2>, b: Vec<2>, c: Vec<2>, depth: number) {
    const result: FlattenedSierpinski = {
        corners: [],
        centers: [],
        stride: a.length
    };
    doTesselateTriangle(a, b, c, depth, result.corners, result.centers);
    return result;
}

function doTesselateTriangle(
    a: Vec<2>, 
    b: Vec<2>, 
    c: Vec<2>, 
    depth: number, 
    corners: number[],
    centers: number[]
) {
    if (depth < 1) {
        corners.push(...a, ...b, ...c);
    } else {
        const ab = vec2.mix(0.5, a, b);
        const bc = vec2.mix(0.5, b, c);
        const ca = vec2.mix(0.5, c, a);
        const newDepth = depth - 1;
        doTesselateTriangle(a, ab, ca, newDepth, corners, centers);
        doTesselateTriangle(ab, b, bc, newDepth, corners, centers);
        doTesselateTriangle(ca, bc, c, newDepth, corners, centers);
        doTesselateTriangle(ab, bc, ca, newDepth, centers, centers);
    }
}
