import * as aether from "aether";
import * as gear from "gear";
const defaultSierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
};
export function newSierpinski() {
    return new SierpinskiImpl();
}
class SierpinskiImpl {
    constructor() {
        this.sierpinski = { ...defaultSierpinski };
        this.flattened = new gear.Lazy(() => tessellatedTriangle(this.sierpinski.a, this.sierpinski.b, this.sierpinski.c, this.sierpinski.depth));
    }
    get a() {
        return this.sierpinski.a;
    }
    set a(a) {
        this.sierpinski.a = a;
        this.flattened.refresh();
    }
    get b() {
        return this.sierpinski.b;
    }
    set b(b) {
        this.sierpinski.b = b;
        this.flattened.refresh();
    }
    get c() {
        return this.sierpinski.c;
    }
    set c(c) {
        this.sierpinski.c = c;
        this.flattened.refresh();
    }
    get depth() {
        return this.sierpinski.depth;
    }
    set depth(depth) {
        this.sierpinski.depth = depth;
        this.flattened.refresh();
    }
    get tessellated() {
        return this.flattened.get();
    }
}
function vec(angleInDegrees) {
    const angle = Math.PI * angleInDegrees / 180;
    return [Math.cos(angle), Math.sin(angle)];
}
function tessellatedTriangle(a, b, c, depth) {
    const result = {
        corners: [],
        centers: [],
        stride: a.length,
        depth
    };
    doTesselateTriangle(a, b, c, depth, result.corners, result.centers);
    return result;
}
function doTesselateTriangle(a, b, c, depth, corners, centers) {
    if (depth < 1) {
        corners.push(...a, ...b, ...c);
    }
    else {
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
//# sourceMappingURL=model.js.map