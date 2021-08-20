import * as Gear from "../gear/all.js";
import { vec2 } from "../../ether/latest/index.js";
const defaultSierpinski = {
    depth: 5,
    a: vec(90),
    b: vec(210),
    c: vec(330)
};
export function sierpinski(depth = new Gear.Value(), a = new Gear.Value(), b = new Gear.Value(), c = new Gear.Value()) {
    const sierpinski = Object.assign({}, defaultSierpinski);
    return from(from(depth).reduce((d, s) => s = Object.assign(Object.assign({}, s), { depth: d }), sierpinski), from(a).reduce((a, s) => s = Object.assign(Object.assign({}, s), { a: a }), sierpinski), from(b).reduce((b, s) => s = Object.assign(Object.assign({}, s), { b: b }), sierpinski), from(c).reduce((c, s) => s = Object.assign(Object.assign({}, s), { c: c }), sierpinski)).map(s => tesselatedTriangle(s.a, s.b, s.c, s.depth));
}
function from(...sources) {
    return Gear.Flow.from(...sources);
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
//# sourceMappingURL=model.js.map