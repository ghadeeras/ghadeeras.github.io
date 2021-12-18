import { ether, gear } from "/gen/libs.js";
const defaultSierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
};
export function sierpinski(depth = new gear.Value(), a = new gear.Value(), b = new gear.Value(), c = new gear.Value()) {
    const sierpinski = Object.assign({}, defaultSierpinski);
    return gear.Value.from(depth.reduce((s, d) => s = Object.assign(Object.assign({}, s), { depth: d }), sierpinski), a.reduce((s, a) => s = Object.assign(Object.assign({}, s), { a: a }), sierpinski), b.reduce((s, b) => s = Object.assign(Object.assign({}, s), { b: b }), sierpinski), c.reduce((s, c) => s = Object.assign(Object.assign({}, s), { c: c }), sierpinski)).map(s => tesselatedTriangle(s.a, s.b, s.c, s.depth));
}
function from(...sources) {
    return gear.Value.from(...sources);
}
function vec(angleInDegrees) {
    const angle = Math.PI * angleInDegrees / 180;
    return [Math.cos(angle), Math.sin(angle)];
}
export function tesselatedTriangle(a, b, c, depth) {
    const result = {
        corners: [],
        centers: [],
        stride: a.length
    };
    doTesselateTriangle(a, b, c, depth, result.corners, result.centers);
    return result;
}
function doTesselateTriangle(a, b, c, depth, corners, centers) {
    if (depth < 1) {
        corners.push(...a, ...b, ...c);
    }
    else {
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
//# sourceMappingURL=model.js.map