import * as aether from "aether"
import * as oldGear from "../utils/legacy/gear/index.js"

export interface FlattenedSierpinski {
    corners: number[];
    centers: number[];
    stride: number;
}

interface Sierpinski {
    depth: number;
    a: aether.Vec<2>;
    b: aether.Vec<2>;
    c: aether.Vec<2>;
}

const defaultSierpinski: Sierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
}

export function sierpinski(
    depth: oldGear.Value<number> = new oldGear.Value(),
    a: oldGear.Value<aether.Vec<2>> = new oldGear.Value(), 
    b: oldGear.Value<aether.Vec<2>> = new oldGear.Value(), 
    c: oldGear.Value<aether.Vec<2>> = new oldGear.Value(),
): oldGear.Value<FlattenedSierpinski> {
    const sierpinski: Sierpinski = { ...defaultSierpinski }
    return oldGear.Value.from<Sierpinski>(
        depth.reduce((s, d) => s = {...s, depth :d}, sierpinski), 
        a.reduce((s, a) => s = {...s, a :a}, sierpinski), 
        b.reduce((s, b) => s = {...s, b :b}, sierpinski), 
        c.reduce((s, c) => s = {...s, c :c}, sierpinski) 
    ).map(s => tessellatedTriangle(s.a, s.b, s.c, s.depth));
}

function vec(angleInDegrees: number): aether.Vec<2> {
    const angle = Math.PI * angleInDegrees / 180
    return [Math.cos(angle), Math.sin(angle)];
}
    
function tessellatedTriangle(a: aether.Vec<2>, b: aether.Vec<2>, c: aether.Vec<2>, depth: number) {
    const result: FlattenedSierpinski = {
        corners: [],
        centers: [],
        stride: a.length
    };
    doTesselateTriangle(a, b, c, depth, result.corners, result.centers);
    return result;
}

function doTesselateTriangle(
    a: aether.Vec<2>, 
    b: aether.Vec<2>, 
    c: aether.Vec<2>, 
    depth: number, 
    corners: number[],
    centers: number[]
) {
    if (depth < 1) {
        corners.push(...a, ...b, ...c);
    } else {
        const ab = aether.vec2.mix(0.5, a, b);
        const bc = aether.vec2.mix(0.5, b, c);
        const ca = aether.vec2.mix(0.5, c, a);
        const newDepth = depth - 1;
        doTesselateTriangle(a, ab, ca, newDepth, corners, centers);
        doTesselateTriangle(ab, b, bc, newDepth, corners, centers);
        doTesselateTriangle(ca, bc, c, newDepth, corners, centers);
        doTesselateTriangle(ab, bc, ca, newDepth, centers, centers);
    }
}
