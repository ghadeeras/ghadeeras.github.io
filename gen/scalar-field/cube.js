import * as Djee from "../djee/all.js";
import * as Space from "../space/all.js";
import * as Gear from "../gear/all.js";
let vertexShaderCode;
let fragmentShaderCode;
let context;
let position;
let normal;
let color;
let matModel;
let lightPosition;
let shininess;
let fogginess;
let cubeBuffer;
let contourSurfaceBuffer;
let contourColorBuffer;
let cube = newCube(-1, -1, -1, -1, -1, -1, -1, -1);
let contourValue = 0;
export function initCubeDemo() {
    window.onload = () => Gear.load("/shaders", () => Space.initWaModules(() => doInit()), ["vertexColors.vert", shader => vertexShaderCode = shader], ["vertexColors.frag", shader => fragmentShaderCode = shader]);
}
function doInit() {
    context = new Djee.Context("canvas-gl");
    const program = context.link([
        context.vertexShader(vertexShaderCode),
        context.fragmentShader(fragmentShaderCode)
    ]);
    program.use();
    cubeBuffer = context.newBuffer();
    contourSurfaceBuffer = context.newBuffer();
    contourColorBuffer = context.newBuffer();
    position = program.locateAttribute("position", 3);
    normal = program.locateAttribute("normal", 3);
    color = program.locateAttribute("color", 4);
    matModel = program.locateUniform("matModel", 4, true);
    const matView = program.locateUniform("matView", 4, true);
    const matProjection = program.locateUniform("matProjection", 4, true);
    lightPosition = program.locateUniform("lightPosition", 3);
    shininess = program.locateUniform("shininess", 1);
    fogginess = program.locateUniform("fogginess", 1);
    matModel.data = Space.Matrix.identity().asColumnMajorArray;
    matView.data = Space.Matrix.globalView(Space.vec(-2, 2, 6), Space.vec(0, 0, 0), Space.vec(0, 1, 0)).asColumnMajorArray;
    matProjection.data = Space.Matrix.project(2, 100, 1).asColumnMajorArray;
    lightPosition.data = [2, 2, 2];
    shininess.data = [1];
    fogginess.data = [0];
    const gl = context.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(1, 1, 1, 1);
    const canvas = Gear.elementEvents("canvas-gl");
    const mouseButtonPressed = canvas.mouseButons.map(([l, m, r]) => l);
    Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(mouseButtonPressed)), canvas.touchPos.map(positions => positions[0])).map(([x, y]) => [
        2 * (x - canvas.element.clientWidth / 2) / canvas.element.clientWidth,
        2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
    ]).branch(flow => flow.filter(selected("rotation")).to(rotationSink()), flow => flow.filter(selected("lightPosition")).to(lightPositionSink()), flow => flow.filter(selected("contourValue")).map(([x, y]) => y).to(contourValueSink()), flow => Gear.Flow.from(flow.filter(selected("value0")).map(([x, y]) => newCube(y, cube.value1, cube.value2, cube.value3, cube.value4, cube.value5, cube.value6, cube.value7)), flow.filter(selected("value1")).map(([x, y]) => newCube(cube.value0, y, cube.value2, cube.value3, cube.value4, cube.value5, cube.value6, cube.value7)), flow.filter(selected("value2")).map(([x, y]) => newCube(cube.value0, cube.value1, y, cube.value3, cube.value4, cube.value5, cube.value6, cube.value7)), flow.filter(selected("value3")).map(([x, y]) => newCube(cube.value0, cube.value1, cube.value2, y, cube.value4, cube.value5, cube.value6, cube.value7)), flow.filter(selected("value4")).map(([x, y]) => newCube(cube.value0, cube.value1, cube.value2, cube.value3, y, cube.value5, cube.value6, cube.value7)), flow.filter(selected("value5")).map(([x, y]) => newCube(cube.value0, cube.value1, cube.value2, cube.value3, cube.value4, y, cube.value6, cube.value7)), flow.filter(selected("value6")).map(([x, y]) => newCube(cube.value0, cube.value1, cube.value2, cube.value3, cube.value4, cube.value5, y, cube.value7)), flow.filter(selected("value7")).map(([x, y]) => newCube(cube.value0, cube.value1, cube.value2, cube.value3, cube.value4, cube.value5, cube.value6, y))).to(cubeSink()));
}
function cubeSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(newCube(-1, -1, -1, -1, -1, -1, -1, -1))
        .producer(newCube => {
        cube = newCube;
        cubeBuffer.untypedData = cubeData(cube);
        contourSurfaceBuffer.untypedData = contourSurfaceData(cube, contourValue);
        contourColorBuffer.untypedData = contourColorData(contourValue, contourSurfaceBuffer.data.length / 6);
        draw();
    }));
}
function contourValueSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(0)
        .producer(newContourValue => {
        contourValue = newContourValue;
        contourSurfaceBuffer.untypedData = contourSurfaceData(cube, contourValue);
        contourColorBuffer.untypedData = contourColorData(contourValue, contourSurfaceBuffer.data.length / 6);
        draw();
    }));
}
function rotationSink() {
    const axisX = Space.vec(1, 0, 0);
    const axisY = Space.vec(0, 1, 0);
    return Gear.sinkFlow(flow => flow.defaultsTo([0, 0]).producer(([x, y]) => {
        matModel.data =
            Space.Matrix.rotation(y * Math.PI, axisX)
                .by(Space.Matrix.rotation(x * Math.PI, axisY))
                .asColumnMajorArray;
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
function selected(value) {
    const mouseBinding = document.getElementById("mouse-binding");
    return () => mouseBinding.value == value;
}
function contourColorData(contourValue, vertexCount) {
    const contourColorData = fieldColor(contourValue, 0.8).coordinates;
    while (contourColorData.length / 4 < vertexCount) {
        contourColorData.push(...contourColorData);
    }
    return contourColorData;
}
function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    position.pointTo(cubeBuffer, 10, 0);
    normal.pointTo(cubeBuffer, 10, 3);
    color.pointTo(cubeBuffer, 10, 6);
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, cubeBuffer.data.length / 10);
    position.pointTo(contourSurfaceBuffer, 6, 0);
    normal.pointTo(contourSurfaceBuffer, 6, 3);
    color.pointTo(contourColorBuffer, 4, 0);
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
    gl.finish();
    gl.flush();
}
function newCube(field0, field1, field2, field3, field4, field5, field6, field7) {
    const points = {
        point0: Space.vec(-1, -1, -1),
        point1: Space.vec(-1, -1, +1),
        point2: Space.vec(-1, +1, -1),
        point3: Space.vec(-1, +1, +1),
        point4: Space.vec(+1, -1, -1),
        point5: Space.vec(+1, -1, +1),
        point6: Space.vec(+1, +1, -1),
        point7: Space.vec(+1, +1, +1),
    };
    const gradients = {
        gradient0: gradient(points.point0, field0, points.point4, field4, points.point2, field2, points.point1, field1),
        gradient1: gradient(points.point1, field1, points.point5, field5, points.point3, field3, points.point0, field0),
        gradient2: gradient(points.point2, field2, points.point6, field6, points.point0, field0, points.point3, field3),
        gradient3: gradient(points.point3, field3, points.point7, field7, points.point1, field1, points.point2, field2),
        gradient4: gradient(points.point4, field4, points.point0, field0, points.point6, field6, points.point5, field5),
        gradient5: gradient(points.point5, field5, points.point1, field1, points.point7, field7, points.point4, field4),
        gradient6: gradient(points.point6, field6, points.point2, field2, points.point4, field4, points.point7, field7),
        gradient7: gradient(points.point7, field7, points.point3, field3, points.point5, field5, points.point6, field6)
    };
    const values = {
        value0: field0,
        value1: field1,
        value2: field2,
        value3: field3,
        value4: field4,
        value5: field5,
        value6: field6,
        value7: field7,
    };
    return Object.assign(Object.assign(Object.assign({}, points), gradients), values);
}
function gradient(point, value, pointX, valueX, pointY, valueY, pointZ, valueZ) {
    return point.minus(pointX).scale(value - valueX)
        .plus(point.minus(pointY).scale(value - valueY))
        .plus(point.minus(pointZ).scale(value - valueZ));
}
function cubeData(cube) {
    const normals = [
        Space.vec(+0, +0, -1),
        Space.vec(+0, +0, +1),
        Space.vec(+0, -1, +0),
        Space.vec(+0, +1, +0),
        Space.vec(-1, +0, +0),
        Space.vec(+1, +0, +0),
    ];
    const colors = [
        fieldColor(cube.value0),
        fieldColor(cube.value1),
        fieldColor(cube.value2),
        fieldColor(cube.value3),
        fieldColor(cube.value4),
        fieldColor(cube.value5),
        fieldColor(cube.value6),
        fieldColor(cube.value7),
    ];
    const vertexes = [
        cube.point0, normals[0], colors[0],
        cube.point2, normals[0], colors[2],
        cube.point4, normals[0], colors[4],
        cube.point4, normals[0], colors[4],
        cube.point2, normals[0], colors[2],
        cube.point6, normals[0], colors[6],
        cube.point7, normals[1], colors[7],
        cube.point3, normals[1], colors[3],
        cube.point5, normals[1], colors[5],
        cube.point5, normals[1], colors[5],
        cube.point3, normals[1], colors[3],
        cube.point1, normals[1], colors[1],
        cube.point0, normals[2], colors[0],
        cube.point4, normals[2], colors[4],
        cube.point1, normals[2], colors[1],
        cube.point1, normals[2], colors[1],
        cube.point4, normals[2], colors[4],
        cube.point5, normals[2], colors[5],
        cube.point7, normals[3], colors[7],
        cube.point6, normals[3], colors[6],
        cube.point3, normals[3], colors[3],
        cube.point3, normals[3], colors[3],
        cube.point6, normals[3], colors[6],
        cube.point2, normals[3], colors[2],
        cube.point0, normals[4], colors[0],
        cube.point1, normals[4], colors[1],
        cube.point2, normals[4], colors[2],
        cube.point2, normals[4], colors[2],
        cube.point1, normals[4], colors[1],
        cube.point3, normals[4], colors[3],
        cube.point7, normals[5], colors[7],
        cube.point5, normals[5], colors[5],
        cube.point6, normals[5], colors[6],
        cube.point6, normals[5], colors[6],
        cube.point5, normals[5], colors[5],
        cube.point4, normals[5], colors[4],
    ];
    return vertexes.reduce((array, vector) => array.concat(...vector.coordinates), []);
}
function contourSurfaceData(cube, contourValue) {
    const stack = Space.modules.stack.exports;
    const space = Space.modules.space.exports;
    const scalarField = Space.modules.scalarField.exports;
    stack.leave();
    stack.enter();
    const p0 = space.vec4(cube.point0.coordinates[0], cube.point0.coordinates[1], cube.point0.coordinates[2], 1);
    const g0 = space.vec4(cube.gradient0.coordinates[0], cube.gradient0.coordinates[1], cube.gradient0.coordinates[2], cube.value0);
    const p1 = space.vec4(cube.point1.coordinates[0], cube.point1.coordinates[1], cube.point1.coordinates[2], 1);
    const g1 = space.vec4(cube.gradient1.coordinates[0], cube.gradient1.coordinates[1], cube.gradient1.coordinates[2], cube.value1);
    const p2 = space.vec4(cube.point2.coordinates[0], cube.point2.coordinates[1], cube.point2.coordinates[2], 1);
    const g2 = space.vec4(cube.gradient2.coordinates[0], cube.gradient2.coordinates[1], cube.gradient2.coordinates[2], cube.value2);
    const p3 = space.vec4(cube.point3.coordinates[0], cube.point3.coordinates[1], cube.point3.coordinates[2], 1);
    const g3 = space.vec4(cube.gradient3.coordinates[0], cube.gradient3.coordinates[1], cube.gradient3.coordinates[2], cube.value3);
    const p4 = space.vec4(cube.point4.coordinates[0], cube.point4.coordinates[1], cube.point4.coordinates[2], 1);
    const g4 = space.vec4(cube.gradient4.coordinates[0], cube.gradient4.coordinates[1], cube.gradient4.coordinates[2], cube.value4);
    const p5 = space.vec4(cube.point5.coordinates[0], cube.point5.coordinates[1], cube.point5.coordinates[2], 1);
    const g5 = space.vec4(cube.gradient5.coordinates[0], cube.gradient5.coordinates[1], cube.gradient5.coordinates[2], cube.value5);
    const p6 = space.vec4(cube.point6.coordinates[0], cube.point6.coordinates[1], cube.point6.coordinates[2], 1);
    const g6 = space.vec4(cube.gradient6.coordinates[0], cube.gradient6.coordinates[1], cube.gradient6.coordinates[2], cube.value6);
    const p7 = space.vec4(cube.point7.coordinates[0], cube.point7.coordinates[1], cube.point7.coordinates[2], 1);
    const g7 = space.vec4(cube.gradient7.coordinates[0], cube.gradient7.coordinates[1], cube.gradient7.coordinates[2], cube.value7);
    const begin = scalarField.tessellateCube(contourValue, p0, p1, p2, p3, p4, p5, p6, p7);
    const end = stack.allocate8(0);
    const result = array(stack, begin, end);
    return result;
}
function array(stack, begin, end) {
    const typedArray = new Float64Array(stack.stack.buffer.slice(begin, end));
    const result = [];
    typedArray.forEach(value => result.push(value));
    return result;
}
function fieldColor(fieldValue, alpha = 0.4) {
    return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha);
}
function normalFrom(p1, p2, p3) {
    const v12 = p2.minus(p1);
    const v23 = p3.minus(p2);
    return v12.cross(v23).unit;
}
//# sourceMappingURL=cube.js.map