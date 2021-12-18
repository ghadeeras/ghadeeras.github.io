import { ether, gear } from "/gen/libs.js"

export interface FlattenedSierpinski {
    corners: number[];
    centers: number[];
    stride: number;
}

interface Sierpinski {
    depth: number;
    a: ether.Vec<2>;
    b: ether.Vec<2>;
    c: ether.Vec<2>;
}

const defaultSierpinski: Sierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
}

export function sierpinski(
    depth: gear.Value<number> = new gear.Value(),
    a: gear.Value<ether.Vec<2>> = new gear.Value(), 
    b: gear.Value<ether.Vec<2>> = new gear.Value(), 
    c: gear.Value<ether.Vec<2>> = new gear.Value(),
): gear.Value<FlattenedSierpinski> {
    const sierpinski: Sierpinski = { ...defaultSierpinski }
    return gear.Value.from<Sierpinski>(
        depth.reduce((s, d) => s = {...s, depth :d}, sierpinski), 
        a.reduce((s, a) => s = {...s, a :a}, sierpinski), 
        b.reduce((s, b) => s = {...s, b :b}, sierpinski), 
        c.reduce((s, c) => s = {...s, c :c}, sierpinski) 
    ).map(s => tesselatedTriangle(s.a, s.b, s.c, s.depth));
}

function from<T>(...sources: gear.Value<T>[]): gear.Value<T> {
    return gear.Value.from(...sources);
}

function vec(angleInDegrees: number): ether.Vec<2> {
    const angle = Math.PI * angleInDegrees / 180
    return [Math.cos(angle), Math.sin(angle)];
}
    
export function tesselatedTriangle(a: ether.Vec<2>, b: ether.Vec<2>, c: ether.Vec<2>, depth: number) {
    const result: FlattenedSierpinski = {
        corners: [],
        centers: [],
        stride: a.length
    };
    doTesselateTriangle(a, b, c, depth, result.corners, result.centers);
    return result;
}

function doTesselateTriangle(
    a: ether.Vec<2>, 
    b: ether.Vec<2>, 
    c: ether.Vec<2>, 
    depth: number, 
    corners: number[],
    centers: number[]
) {
    if (depth < 1) {
        corners.push(...a, ...b, ...c);
    } else {
        const ab = ether.vec2.mix(0.5, a, b);
        const bc = ether.vec2.mix(0.5, b, c);
        const ca = ether.vec2.mix(0.5, c, a);
        const newDepth = depth - 1;
        doTesselateTriangle(a, ab, ca, newDepth, corners, centers);
        doTesselateTriangle(ab, b, bc, newDepth, corners, centers);
        doTesselateTriangle(ca, bc, c, newDepth, corners, centers);
        doTesselateTriangle(ab, bc, ca, newDepth, centers, centers);
    }
}
