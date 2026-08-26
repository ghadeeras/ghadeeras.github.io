import * as aether from "aether"
import * as gear from "gear"

export interface FlattenedSierpinski {
    corners: number[];
    centers: number[];
    stride: number;
    depth: number
}

export interface Sierpinski {
    depth: number;
    a: aether.Vec<2>;
    b: aether.Vec<2>;
    c: aether.Vec<2>;
    tessellated: FlattenedSierpinski
}

const defaultSierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
}

export function newSierpinski() {
    return new SierpinskiImpl()
}

class SierpinskiImpl implements Sierpinski {

    private sierpinski = { ...defaultSierpinski }
    private flattened = new gear.Lazy(() => tessellatedTriangle(
        this.sierpinski.a,
        this.sierpinski.b,
        this.sierpinski.c,
        this.sierpinski.depth,
    ))

    get a() {
        return this.sierpinski.a
    }

    set a(a: aether.Vec2) {
        this.sierpinski.a = a
        this.flattened.refresh()
    }

    get b() {
        return this.sierpinski.b
    }

    set b(b: aether.Vec2) {
        this.sierpinski.b = b
        this.flattened.refresh()
    }

    get c() {
        return this.sierpinski.c
    }

    set c(c: aether.Vec2) {
        this.sierpinski.c = c
        this.flattened.refresh()
    }

    get depth(): number {
        return this.sierpinski.depth
    }

    set depth(depth: number) {
        this.sierpinski.depth = depth
        this.flattened.refresh()
    }

    get tessellated() {
        return this.flattened.get()
    }

}

function vec(angleInDegrees: number): aether.Vec<2> {
    const angle = Math.PI * angleInDegrees / 180
    return [Math.cos(angle), Math.sin(angle)];
}
    
function tessellatedTriangle(a: aether.Vec<2>, b: aether.Vec<2>, c: aether.Vec<2>, depth: number) {
    const result: FlattenedSierpinski = {
        corners: [],
        centers: [],
        stride: a.length,
        depth
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
