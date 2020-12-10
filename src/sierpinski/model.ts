import * as Gear from "../gear/all.js"
import * as Space from "../space/all.js"

export interface FlattenedSierpinski {
    corners: number[];
    centers: number[];
    stride: number;
}

interface Sierpinski {
    depth: number;
    a: Space.Vector;
    b: Space.Vector;
    c: Space.Vector;
}

const defaultSierpinski: Sierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
}

export function sierpinski(
    depth: Gear.Source<number> = new Gear.Value(),
    a: Gear.Source<Space.Vector> = new Gear.Value(), 
    b: Gear.Source<Space.Vector> = new Gear.Value(), 
    c: Gear.Source<Space.Vector> = new Gear.Value(),
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

function vec(angleInDegrees: number) {
    const angle = Math.PI * angleInDegrees / 180
    return Space.vec(Math.cos(angle), Math.sin(angle));
}
    
export function tesselatedTriangle(a: Space.Vector, b: Space.Vector, c: Space.Vector, depth: number) {
    const result: FlattenedSierpinski = {
        corners: [],
        centers: [],
        stride: a.coordinates.length
    };
    doTesselateTriangle(a, b, c, depth, result.corners, result.centers);
    return result;
}

function doTesselateTriangle(
    a: Space.Vector, 
    b: Space.Vector, 
    c: Space.Vector, 
    depth: number, 
    corners: number[],
    centers: number[]
) {
    if (depth < 1) {
        corners.push(...a.coordinates, ...b.coordinates, ...c.coordinates);
    } else {
        const ab = a.mix(b, 0.5);
        const bc = b.mix(c, 0.5);
        const ca = c.mix(a, 0.5);
        const newDepth = depth - 1;
        doTesselateTriangle(a, ab, ca, newDepth, corners, centers);
        doTesselateTriangle(ab, b, bc, newDepth, corners, centers);
        doTesselateTriangle(ca, bc, c, newDepth, corners, centers);
        doTesselateTriangle(ab, bc, ca, newDepth, centers, centers);
    }
}
