var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as djee from "../djee/all.js";
import * as ether from "../../ether/latest/index.js";
import * as gear from "../../gear/latest/index.js";
import * as dragging from "../utils/dragging.js";
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
let cube = newCube(-1, -1, -1, -1, -1, -1, -1, -1);
let contourValue = 0;
const viewMatrix = ether.mat4.lookAt([-2, 2, 6], [0, 0, 0], [0, 1, 0]);
const projectionMatrix = ether.mat4.projection(2);
let scalarFieldInstance;
export function initCubeDemo() {
    window.onload = () => doInit();
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield gear.fetchTextFiles({
            vertexShaderCode: "vertexColors.vert",
            fragmentShaderCode: "vertexColors.frag"
        }, "/shaders");
        const scalarFieldModule = yield ether.loadScalarFieldModule();
        scalarFieldInstance = scalarFieldModule.newInstance();
        context = djee.Context.of("canvas-gl");
        const program = context.link(context.vertexShader(shaders.vertexShaderCode), context.fragmentShader(shaders.fragmentShaderCode));
        program.use();
        cubeBuffer = context.newAttributesBuffer(10 * 4);
        contourSurfaceBuffer = context.newAttributesBuffer(6 * 4);
        position = program.attribute("position");
        normal = program.attribute("normal");
        color = program.attribute("color");
        matModel = program.uniform("matModel");
        const matView = program.uniform("matView");
        const matProjection = program.uniform("matProjection");
        lightPosition = program.uniform("lightPosition");
        shininess = program.uniform("shininess");
        fogginess = program.uniform("fogginess");
        matModel.data = ether.mat4.columnMajorArray(ether.mat4.identity());
        matView.data = ether.mat4.columnMajorArray(viewMatrix);
        matProjection.data = ether.mat4.columnMajorArray(projectionMatrix);
        lightPosition.data = [2, 2, 2];
        shininess.data = [1];
        fogginess.data = [0];
        const gl = context.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(1, 1, 1, 1);
        const canvas = gear.elementEvents("canvas-gl");
        const transformer = new dragging.RotationDragging(() => ether.mat4.from(matModel.data), () => ether.mat4.mul(projectionMatrix, viewMatrix), 4);
        const cases = {
            rotation: new gear.Value(),
            lightPosition: new gear.Value(),
            contourValue: new gear.Value(),
            value0: new gear.Value(),
            value1: new gear.Value(),
            value2: new gear.Value(),
            value3: new gear.Value(),
            value4: new gear.Value(),
            value5: new gear.Value(),
            value6: new gear.Value(),
            value7: new gear.Value(),
        };
        const mouseBinding = gear.readableValue("mouse-binding");
        gear.invokeLater(() => mouseBinding.flow("rotation"));
        canvas.dragging.value.switch(mouseBinding, cases);
        cases.rotation
            .then(gear.drag(transformer))
            .defaultsTo(transformer.currentValue())
            .attach(m => matModel.data = ether.mat4.columnMajorArray(m));
        cases.lightPosition
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => ether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
            .defaultsTo([Math.PI / 4, Math.PI / 4])
            .map(([x, y]) => [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)])
            .attach(pos => lightPosition.data = pos);
        const cubeValue = gear.Value.from(cases.value0
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(0)), cases.value1
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(1)), cases.value2
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(2)), cases.value3
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(3)), cases.value4
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(4)), cases.value5
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(5)), cases.value6
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(6)), cases.value7
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(7))).reduce(cubeAdjustor, cube)
            .defaultsTo(cube);
        cubeValue
            .map(c => cubeData(cube = c))
            .attach(data => cubeBuffer.float32Data = data);
        gear.Value.from(cubeValue
            .map(c => contourSurfaceData(cube = c, contourValue)), cases.contourValue
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => y)
            .defaultsTo(0)
            .map(v => contourSurfaceData(cube, contourValue = v))).attach(data => contourSurfaceBuffer.float32Data = data);
        draw();
    });
}
function cornerValue(corner) {
    return ([x, y]) => [corner, y];
}
function cubeAdjustor(cube, cornerValue) {
    const [corner, value] = cornerValue;
    const values = [cube.value0, cube.value1, cube.value2, cube.value3, cube.value4, cube.value5, cube.value6, cube.value7];
    values[corner] = value;
    return newCube(values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7]);
}
function contourColorData(contourValue) {
    return fieldColor(contourValue, 0.8);
}
function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    const unit = contourSurfaceBuffer.word;
    position.pointTo(cubeBuffer, 0 * cubeBuffer.word);
    normal.pointTo(cubeBuffer, 3 * cubeBuffer.word);
    color.pointTo(cubeBuffer, 6 * cubeBuffer.word);
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, cubeBuffer.data.length / 10);
    gl.flush();
    position.pointTo(contourSurfaceBuffer, 0 * contourSurfaceBuffer.word);
    normal.pointTo(contourSurfaceBuffer, 3 * contourSurfaceBuffer.word);
    color.setTo(...contourColorData(contourValue));
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
    gl.flush();
    requestAnimationFrame(draw);
}
function newCube(field0, field1, field2, field3, field4, field5, field6, field7) {
    const points = {
        point0: [-1, -1, -1],
        point1: [-1, -1, +1],
        point2: [-1, +1, -1],
        point3: [-1, +1, +1],
        point4: [+1, -1, -1],
        point5: [+1, -1, +1],
        point6: [+1, +1, -1],
        point7: [+1, +1, +1],
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
    return ether.vec3.add(ether.vec3.scale(ether.vec3.sub(point, pointX), value - valueX), ether.vec3.add(ether.vec3.scale(ether.vec3.sub(point, pointY), value - valueY), ether.vec3.scale(ether.vec3.sub(point, pointZ), value - valueZ)));
}
function cubeData(cube) {
    const normals = [
        [+0, +0, -1],
        [+0, +0, +1],
        [+0, -1, +0],
        [+0, +1, +0],
        [-1, +0, +0],
        [+1, +0, +0],
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
    return vertexes.reduce((a, v) => a.concat(...v), []);
}
function contourSurfaceData(cube, contourValue) {
    const stack = scalarFieldInstance.mem;
    const space = scalarFieldInstance.space;
    const scalarField = scalarFieldInstance.scalarField;
    if (!stack || !space || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Ether modules!");
    }
    stack.leave();
    stack.enter();
    const p0 = space.f64_vec4(cube.point0[0], cube.point0[1], cube.point0[2], 1);
    const g0 = space.f64_vec4(cube.gradient0[0], cube.gradient0[1], cube.gradient0[2], cube.value0);
    const p1 = space.f64_vec4(cube.point1[0], cube.point1[1], cube.point1[2], 1);
    const g1 = space.f64_vec4(cube.gradient1[0], cube.gradient1[1], cube.gradient1[2], cube.value1);
    const p2 = space.f64_vec4(cube.point2[0], cube.point2[1], cube.point2[2], 1);
    const g2 = space.f64_vec4(cube.gradient2[0], cube.gradient2[1], cube.gradient2[2], cube.value2);
    const p3 = space.f64_vec4(cube.point3[0], cube.point3[1], cube.point3[2], 1);
    const g3 = space.f64_vec4(cube.gradient3[0], cube.gradient3[1], cube.gradient3[2], cube.value3);
    const p4 = space.f64_vec4(cube.point4[0], cube.point4[1], cube.point4[2], 1);
    const g4 = space.f64_vec4(cube.gradient4[0], cube.gradient4[1], cube.gradient4[2], cube.value4);
    const p5 = space.f64_vec4(cube.point5[0], cube.point5[1], cube.point5[2], 1);
    const g5 = space.f64_vec4(cube.gradient5[0], cube.gradient5[1], cube.gradient5[2], cube.value5);
    const p6 = space.f64_vec4(cube.point6[0], cube.point6[1], cube.point6[2], 1);
    const g6 = space.f64_vec4(cube.gradient6[0], cube.gradient6[1], cube.gradient6[2], cube.value6);
    const p7 = space.f64_vec4(cube.point7[0], cube.point7[1], cube.point7[2], 1);
    const g7 = space.f64_vec4(cube.gradient7[0], cube.gradient7[1], cube.gradient7[2], cube.value7);
    const begin = scalarField.tessellateCube(contourValue, p0, p1, p2, p3, p4, p5, p6, p7);
    const end = stack.allocate8(0);
    const result = new Float32Array(stack.stack.buffer, begin, (end - begin) / 4);
    return result;
}
function fieldColor(fieldValue, alpha = 0.4) {
    return [(1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha];
}
//# sourceMappingURL=cube.js.map