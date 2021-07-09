import * as Djee from "../djee/all.js";
import * as Space from "../space/all.js";
import * as Gear from "../gear/all.js";
let resolution = 64;
let fieldSampler = envelopedCosine;
let vertexShaderCode;
let fragmentShaderCode;
let context;
let position;
let normal;
let matModel;
let matProjection;
let lightPosition;
let color;
let shininess;
let fogginess;
let contourSurfaceBuffer;
let contourValue = 0;
let fieldRef = 0;
export function init() {
    window.onload = () => Gear.load("/shaders", () => Space.initWaModules(() => doInit()), ["uniformColors.vert", shader => vertexShaderCode = shader], ["uniformColors.frag", shader => fragmentShaderCode = shader]);
}
const viewMatrix = Space.Matrix.globalView(Space.vec(-2, 2, 10), Space.vec(0, 0, 0), Space.vec(0, 1, 0));
const projectionMatrix = Space.Matrix.project(4, 100, 1);
function doInit() {
    fieldRef = sampleField();
    context = Djee.Context.of("canvas-gl");
    const program = context.link(context.vertexShader(vertexShaderCode), context.fragmentShader(fragmentShaderCode));
    program.use();
    contourSurfaceBuffer = context.newBuffer(6 * 4);
    position = program.attribute("position");
    normal = program.attribute("normal");
    matModel = program.uniform("matModel");
    const matView = program.uniform("matView");
    matProjection = program.uniform("matProjection");
    lightPosition = program.uniform("lightPosition");
    color = program.uniform("color");
    shininess = program.uniform("shininess");
    fogginess = program.uniform("fogginess");
    matModel.data = Space.Matrix.identity().asColumnMajorArray;
    matView.data = viewMatrix.asColumnMajorArray;
    matProjection.data = projectionMatrix.asColumnMajorArray;
    const gl = context.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.clearDepth(1);
    gl.clearColor(1, 1, 1, 1);
    const canvas = Gear.elementEvents("canvas-gl");
    canvas.dragging.branch(flow => flow.map(d => d.pos).map(([x, y]) => Gear.pos(2 * (x - canvas.element.clientWidth / 2) / canvas.element.clientWidth, 2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight)).branch(flow => flow.filter(selected("focalRatio")).map(([x, y]) => y).to(focalRatioSink()), flow => flow.filter(selected("lightPosition")).to(lightPositionSink()), flow => flow.filter(selected("contourValue")).map(([x, y]) => y).defaultsTo(0.01).to(contourValueSink()), flow => flow.filter(selected("shininess")).map(([x, y]) => y).to(shininessSink()), flow => flow.filter(selected("fogginess")).map(([x, y]) => y).to(fogginessSink())), flow => flow
        .filter(selected("rotation"))
        .map(Gear.rotation(canvas.element, projectionMatrix.by(viewMatrix)))
        .to(rotationSink()));
    levelOfDetailsFlow().to(levelOfDetailsSink());
    Gear.readableValue("function").to(functionSink());
}
function selected(value) {
    const mouseBinding = document.getElementById("mouse-binding");
    return () => mouseBinding.value == value;
}
function levelOfDetailsFlow() {
    const inc = Gear.elementEvents("lod-inc").mouseButtons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? +8 : 0);
    const dec = Gear.elementEvents("lod-dec").mouseButtons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? -8 : 0);
    const flow = Gear.Flow.from(inc, dec)
        .defaultsTo(0)
        .then(Gear.repeater(128, 0))
        .reduce((i, lod) => clamp(lod + i, 32, 96), 64);
    flow.map(lod => lod.toString()).to(Gear.text("lod"));
    return flow;
}
function clamp(n, min, max) {
    return n < min ? min : (n > max ? max : n);
}
function levelOfDetailsSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(64)
        .producer(lod => {
        resolution = lod;
        fieldRef = sampleField();
        contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
        draw();
    }));
}
function contourValueSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(0)
        .producer(newContourValue => {
        contourValue = newContourValue;
        contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
        color.data = fieldColor(contourValue, 1).coordinates;
        draw();
    }));
}
function fieldColor(fieldValue, alpha = 0.4) {
    return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha);
}
function rotationSink() {
    return Gear.sinkFlow(flow => flow.defaultsTo(Space.Matrix.identity()).producer(matrix => {
        matModel.data = matrix.asColumnMajorArray;
        draw();
    }));
}
function focalRatioSink() {
    return Gear.sinkFlow(flow => flow.defaultsTo(0).map(ratio => (ratio + 1.4) * 3).producer(ratio => {
        matProjection.data = Space.Matrix.project(ratio, 100, 1).asColumnMajorArray;
        draw();
    }));
}
function lightPositionSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo([0.5, 0.5])
        .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
        .producer(([x, y]) => {
        lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)];
        draw();
    }));
}
function shininessSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
        shininess.data = [value];
        draw();
    }));
}
function fogginessSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
        fogginess.data = [value];
        draw();
    }));
}
function functionSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo("xyz")
        .producer(functionName => {
        fieldSampler = getFieldFunction(functionName);
        fieldRef = sampleField();
        contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
        draw();
    }));
}
function getFieldFunction(functionName) {
    switch (functionName) {
        case "xyz": return xyz;
        case "envelopedCosine": return envelopedCosine;
        default: return xyz;
    }
}
function sampleField() {
    const stack = Space.modules.stack.exports;
    const space = Space.modules.space.exports;
    if (!stack || !space) {
        throw new Error("Failed to initialize Web Assembly Space modules!");
    }
    stack.leave();
    stack.leave();
    stack.enter();
    const ref = stack.allocate8(0);
    for (let z = 0; z <= resolution; z++) {
        for (let y = 0; y <= resolution; y++) {
            for (let x = 0; x <= resolution; x++) {
                const px = 2 * x / resolution - 1;
                const py = 2 * y / resolution - 1;
                const pz = 2 * z / resolution - 1;
                const v = fieldSampler(px, py, pz).coordinates;
                space.vec4(px, py, pz, 1);
                space.vec4(v[0], v[1], v[2], v[3]);
            }
        }
    }
    stack.enter();
    return ref;
}
function contourSurfaceData(fieldRef, contourValue) {
    const stack = Space.modules.stack.exports;
    const scalarField = Space.modules.scalarField.exports;
    if (!stack || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Space modules!");
    }
    stack.leave();
    stack.enter();
    const begin = scalarField.tesselateScalarField(fieldRef, resolution, contourValue);
    const end = stack.allocate8(0);
    const result = new Float32Array(new Float64Array(stack.stack.buffer, begin, (end - begin) / 8));
    return result;
}
const twoPi = 2 * Math.PI;
function xyz(x, y, z) {
    return Space.vec(y * z, z * x, x * y, x * y * z);
}
function envelopedCosine(x, y, z) {
    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;
    if (x2 <= 1 && y2 <= 1 && z2 <= 1) {
        const piX2 = Math.PI * x2;
        const piY2 = Math.PI * y2;
        const piZ2 = Math.PI * z2;
        const envelope = (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 8;
        const piX = Math.PI * x;
        const piY = Math.PI * y;
        const piZ = Math.PI * z;
        const value = Math.cos(2 * piX) + Math.cos(2 * piY) + Math.cos(2 * piZ);
        const dEnvelopeDX = -piX * Math.sin(piX2) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 4;
        const dEnvelopeDY = -piY * Math.sin(piY2) * (Math.cos(piX2) + 1) * (Math.cos(piZ2) + 1) / 4;
        const dEnvelopeDZ = -piZ * Math.sin(piZ2) * (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) / 4;
        const dValueDX = -twoPi * Math.sin(2 * piX);
        const dValueDY = -twoPi * Math.sin(2 * piY);
        const dValueDZ = -twoPi * Math.sin(2 * piZ);
        return Space.vec(dEnvelopeDX * value + envelope * dValueDX, dEnvelopeDY * value + envelope * dValueDY, dEnvelopeDZ * value + envelope * dValueDZ, envelope * value / 3);
    }
    else {
        return Space.vec(0, 0, 0, 0);
    }
}
function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    position.pointTo(contourSurfaceBuffer, 0 * contourSurfaceBuffer.word);
    normal.pointTo(contourSurfaceBuffer, 3 * contourSurfaceBuffer.word);
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
    gl.finish();
    gl.flush();
}
//# sourceMappingURL=toy.js.map