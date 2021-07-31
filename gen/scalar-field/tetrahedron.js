var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as Djee from "../djee/all.js";
import * as Space from "../space/all.js";
import * as Gear from "../gear/all.js";
import { mat4, vec3, vec4 } from "../space/all.js";
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
let tetrahedronBuffer;
let contourSurfaceBuffer;
let tetrahedron = newTetrahedron(1, -1, -1, -1);
let contourValue = 0;
const viewMatrix = mat4.lookAt([-1, 1, 2], [0, 0, 0], [0, 1, 0]);
const projectionMatrix = mat4.projection(2);
export function initTetrahedronDemo() {
    window.onload = () => Gear.load("/shaders", () => doInit(), ["vertexColors.vert", shader => vertexShaderCode = shader], ["vertexColors.frag", shader => fragmentShaderCode = shader]);
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Space.initWaModules();
        context = Djee.Context.of("canvas-gl");
        const program = context.link(context.vertexShader(vertexShaderCode), context.fragmentShader(fragmentShaderCode));
        program.use();
        tetrahedronBuffer = context.newAttributesBuffer(10 * 4);
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
        matModel.data = mat4.columnMajorArray(mat4.identity());
        matView.data = mat4.columnMajorArray(viewMatrix);
        matProjection.data = mat4.columnMajorArray(projectionMatrix);
        lightPosition.data = [2, 2, 2];
        shininess.data = [1];
        fogginess.data = [0];
        const gl = context.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(1, 1, 1, 1);
        const canvas = Gear.elementEvents("canvas-gl");
        const transformer = new Gear.Transformer(canvas.element, mat4.mul(projectionMatrix, viewMatrix));
        canvas.dragging.branch(flow => flow.map(d => d.pos).map(([x, y]) => Gear.pos(2 * (x - canvas.element.clientWidth / 2) / canvas.element.clientWidth, 2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight)).branch(flow => flow.filter(selected("lightPosition")).to(lightPositionSink()), flow => flow.filter(selected("contourValue")).map(([x, y]) => y).to(contourValueSink()), flow => Gear.Flow.from(flow.filter(selected("value0")).map(([x, y]) => newTetrahedron(y, tetrahedron.value1, tetrahedron.value2, tetrahedron.value3)), flow.filter(selected("value1")).map(([x, y]) => newTetrahedron(tetrahedron.value0, y, tetrahedron.value2, tetrahedron.value3)), flow.filter(selected("value2")).map(([x, y]) => newTetrahedron(tetrahedron.value0, tetrahedron.value1, y, tetrahedron.value3)), flow.filter(selected("value3")).map(([x, y]) => newTetrahedron(tetrahedron.value0, tetrahedron.value1, tetrahedron.value2, y))).to(tetrahedronSink())), flow => flow
            .filter(selected("rotation"))
            .map(transformer.rotation)
            .to(rotationSink()));
    });
}
function tetrahedronSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(newTetrahedron(1, -1, -1, -1))
        .producer(newTetrahedron => {
        tetrahedron = newTetrahedron;
        tetrahedronBuffer.float32Data = tetrahedronData(tetrahedron);
        contourSurfaceBuffer.data = contourSurfaceData(tetrahedron, contourValue);
        draw();
    }));
}
function contourValueSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(0)
        .producer(newContourValue => {
        contourValue = newContourValue;
        contourSurfaceBuffer.data = contourSurfaceData(tetrahedron, contourValue);
        draw();
    }));
}
function rotationSink() {
    return Gear.sinkFlow(flow => flow.defaultsTo(mat4.identity()).producer(matrix => {
        matModel.data = mat4.columnMajorArray(matrix);
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
function contourColorData(contourValue) {
    return fieldColor(contourValue, 0.8);
}
function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    position.pointTo(tetrahedronBuffer, 0 * tetrahedronBuffer.word);
    normal.pointTo(tetrahedronBuffer, 3 * tetrahedronBuffer.word);
    color.pointTo(tetrahedronBuffer, 6 * tetrahedronBuffer.word);
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, tetrahedronBuffer.data.length / 10);
    gl.flush();
    position.pointTo(contourSurfaceBuffer, 0 * contourSurfaceBuffer.word);
    normal.pointTo(contourSurfaceBuffer, 3 * contourSurfaceBuffer.word);
    color.setTo(...contourColorData(contourValue));
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
    gl.flush();
}
function newTetrahedron(field0, field1, field2, field3) {
    const angle = 2 * Math.PI / 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const points = {
        point0: [0, 1, 0],
        point1: [sin, cos, 0],
        point2: [cos * sin, cos, -sin * sin],
        point3: [cos * sin, cos, +sin * sin]
    };
    const mat = [
        [points.point0[0], points.point0[1], points.point0[2], 1],
        [points.point1[0], points.point1[1], points.point1[2], 1],
        [points.point2[0], points.point2[1], points.point2[2], 1],
        [points.point3[0], points.point3[1], points.point3[2], 1]
    ];
    const matInv = mat4.inverse(mat);
    const gradient = vec3.swizzle(vec4.prod([field0, field1, field2, field3], matInv), 0, 1, 2);
    const gradients = {
        gradient0: gradient,
        gradient1: gradient,
        gradient2: gradient,
        gradient3: gradient
    };
    const values = {
        value0: field0,
        value1: field1,
        value2: field2,
        value3: field3
    };
    return Object.assign(Object.assign(Object.assign({}, points), gradients), values);
}
function tetrahedronData(tetrahedron) {
    const normals = [
        normalFrom(tetrahedron.point3, tetrahedron.point2, tetrahedron.point1),
        normalFrom(tetrahedron.point2, tetrahedron.point3, tetrahedron.point0),
        normalFrom(tetrahedron.point1, tetrahedron.point0, tetrahedron.point3),
        normalFrom(tetrahedron.point0, tetrahedron.point1, tetrahedron.point2)
    ];
    const colors = [
        fieldColor(tetrahedron.value0),
        fieldColor(tetrahedron.value1),
        fieldColor(tetrahedron.value2),
        fieldColor(tetrahedron.value3)
    ];
    const tetrahedronVertexes = [
        tetrahedron.point3, normals[0], colors[3],
        tetrahedron.point2, normals[0], colors[2],
        tetrahedron.point1, normals[0], colors[1],
        tetrahedron.point2, normals[1], colors[2],
        tetrahedron.point3, normals[1], colors[3],
        tetrahedron.point0, normals[1], colors[0],
        tetrahedron.point1, normals[2], colors[1],
        tetrahedron.point0, normals[2], colors[0],
        tetrahedron.point3, normals[2], colors[3],
        tetrahedron.point0, normals[3], colors[0],
        tetrahedron.point1, normals[3], colors[1],
        tetrahedron.point2, normals[3], colors[2]
    ];
    return tetrahedronVertexes.reduce((a, v) => a.concat(...v), []);
}
function contourSurfaceData(tetrahedron, contourValue) {
    const stack = Space.modules.mem.exports;
    const space = Space.modules.space.exports;
    const scalarField = Space.modules.scalarField.exports;
    if (!stack || !space || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Space modules!");
    }
    stack.leave();
    stack.enter();
    const p0 = space.f64_vec4(tetrahedron.point0[0], tetrahedron.point0[1], tetrahedron.point0[2], 1);
    const g0 = space.f64_vec4(tetrahedron.gradient0[0], tetrahedron.gradient0[1], tetrahedron.gradient0[2], tetrahedron.value0);
    const p1 = space.f64_vec4(tetrahedron.point1[0], tetrahedron.point1[1], tetrahedron.point1[2], 1);
    const g1 = space.f64_vec4(tetrahedron.gradient1[0], tetrahedron.gradient1[1], tetrahedron.gradient1[2], tetrahedron.value1);
    const p2 = space.f64_vec4(tetrahedron.point2[0], tetrahedron.point2[1], tetrahedron.point2[2], 1);
    const g2 = space.f64_vec4(tetrahedron.gradient2[0], tetrahedron.gradient2[1], tetrahedron.gradient2[2], tetrahedron.value2);
    const p3 = space.f64_vec4(tetrahedron.point3[0], tetrahedron.point3[1], tetrahedron.point3[2], 1);
    const g3 = space.f64_vec4(tetrahedron.gradient3[0], tetrahedron.gradient3[1], tetrahedron.gradient3[2], tetrahedron.value3);
    const begin = scalarField.tessellateTetrahedron(contourValue, p0, p1, p2, p3);
    const end = stack.allocate8(0);
    const result = new Float32Array(stack.stack.buffer, begin, (end - begin) / 4);
    return result;
}
function fieldColor(fieldValue, alpha = 0.4) {
    return [(1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha];
}
function normalFrom(p1, p2, p3) {
    const v12 = vec3.sub(p2, p1);
    const v23 = vec3.sub(p3, p2);
    return vec3.unit(vec3.cross(v12, v23));
}
//# sourceMappingURL=tetrahedron.js.map