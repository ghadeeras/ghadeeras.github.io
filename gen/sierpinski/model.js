import * as Gear from "../gear/all.js";
import * as Space from "../space/all.js";
const defaultSierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
};
export function sierpinski(depth = new Gear.Value(defaultSierpinski.depth), a = new Gear.Value(defaultSierpinski.a), b = new Gear.Value(defaultSierpinski.b), c = new Gear.Value(defaultSierpinski.c)) {
    const sierpinski = Object.assign({}, defaultSierpinski);
    return from(from(depth).reduce((d, s) => s = Object.assign(Object.assign({}, s), { depth: d }), sierpinski), from(a).reduce((a, s) => s = Object.assign(Object.assign({}, s), { a: a }), sierpinski), from(b).reduce((b, s) => s = Object.assign(Object.assign({}, s), { b: b }), sierpinski), from(c).reduce((c, s) => s = Object.assign(Object.assign({}, s), { c: c }), sierpinski)).map(s => tesselatedTriangle(s.a, s.b, s.c, s.depth));
}
function from(...sources) {
    return Gear.Flow.from(...sources);
}
function vec(angleInDegrees) {
    const angle = Math.PI * angleInDegrees / 180;
    return Space.vec(Math.cos(angle), Math.sin(angle));
}
export function tesselatedTriangle(a, b, c, depth) {
    const result = {
        corners: [],
        centers: [],
        stride: a.coordinates.length
    };
    doTesselateTriangle(a, b, c, depth, result.corners, result.centers);
    return result;
}
function doTesselateTriangle(a, b, c, depth, corners, centers) {
    if (depth < 1) {
        corners.push(...a.coordinates, ...b.coordinates, ...c.coordinates);
    }
    else {
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
//# sourceMappingURL=model.js.map