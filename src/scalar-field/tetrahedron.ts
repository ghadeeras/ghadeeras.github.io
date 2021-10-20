import * as djee from "../djee/all.js"
import * as ether from "../../ether/latest/index.js"
import * as gear from "../../gear/latest/index.js"
import * as dragging from "../utils/dragging.js"
import { Mat, mat4, Vec, vec3, vec4 } from "../../ether/latest/index.js";
import { asMat } from "./view.js";

let context: djee.Context;

let position: djee.Attribute;
let normal: djee.Attribute;
let color: djee.Attribute;

let matModel: djee.Uniform;
let lightPosition: djee.Uniform;
let shininess: djee.Uniform;
let fogginess: djee.Uniform;

let tetrahedronBuffer: djee.AttributesBuffer;
let contourSurfaceBuffer: djee.AttributesBuffer;

let tetrahedron: Tetrahedron = newTetrahedron(1, -1, -1, -1);
let contourValue: number = 0;

type Tetrahedron = TetrahedronPoints & TetrahedronGradients & TetrahedronValues

type TetrahedronPoints = {
    point0: Vec<3>;
    point1: Vec<3>;
    point2: Vec<3>;
    point3: Vec<3>;
}

type TetrahedronGradients = {
    gradient0: Vec<3>;
    gradient1: Vec<3>;
    gradient2: Vec<3>;
    gradient3: Vec<3>;
}

type TetrahedronValues = {
    value0: number;
    value1: number;
    value2: number;
    value3: number;
}

const viewMatrix = mat4.lookAt([-1, 1, 2], [0, 0, 0], [0, 1, 0]);
const projectionMatrix = mat4.projection(2);

export function initTetrahedronDemo() {
    window.onload = () => doInit();
}

async function doInit() {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "vertexColors.vert",
        fragmentShaderCode: "vertexColors.frag"
    }, "/shaders")

    await ether.initWaModules()
    context = djee.Context.of("canvas-gl");

    const program = context.link(
        context.vertexShader(shaders.vertexShaderCode),
        context.fragmentShader(shaders.fragmentShaderCode)
    )
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

    matModel.data = mat4.columnMajorArray(mat4.identity())
    matView.data = mat4.columnMajorArray(viewMatrix);
    matProjection.data = mat4.columnMajorArray(projectionMatrix);

    lightPosition.data = [2, 2, 2];
    shininess.data = [1];
    fogginess.data = [0];

    const gl = context.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(1, 1, 1, 1);

    const canvas = gear.elementEvents("canvas-gl");
    const transformer = new dragging.RotationDragging(
        () => asMat(matModel.data), 
        () => mat4.mul(projectionMatrix, viewMatrix),
        4
    )

    const cases = {
        rotation: new gear.Value<gear.Dragging>(),
        lightPosition: new gear.Value<gear.Dragging>(),
        contourValue: new gear.Value<gear.Dragging>(),
        value0: new gear.Value<gear.Dragging>(),
        value1: new gear.Value<gear.Dragging>(),
        value2: new gear.Value<gear.Dragging>(),
        value3: new gear.Value<gear.Dragging>(),
    }
    const mouseBinding = gear.readableValue("mouse-binding")
    gear.invokeLater(() => mouseBinding.flow("rotation"))
    canvas.dragging.value.switch(mouseBinding, cases)
    
    rotationTarget().value = cases.rotation
        .then(gear.drag(transformer))
        .defaultsTo(mat4.identity())

    lightPositionTarget().value = cases.lightPosition
        .then(gear.drag(dragging.positionDragging))
        .map(([x, y]) => ether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
        .defaultsTo([Math.PI / 4, Math.PI / 4])

    contourValueTarget().value = cases.contourValue
        .then(gear.drag(dragging.positionDragging))
        .map(([x, y]) => y)
        .defaultsTo(0)

    tetrahedronTarget().value = gear.Value.from(
        cases.value0
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(0)),
        cases.value1
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(1)),
        cases.value2
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(2)),
        cases.value3
            .then(gear.drag(dragging.positionDragging))
            .map(cornerValue(3)),
    ).reduce(tetrahedronAdjustor, tetrahedron).defaultsTo(tetrahedron)
}

type TetrahedronCorner = 0 | 1 | 2 | 3
type TetrahedronCornerValue = [TetrahedronCorner, number]

function cornerValue(corner: TetrahedronCorner): (xy: ether.Vec<2>) => TetrahedronCornerValue {
    return ([x, y]) => [corner, y]
} 

function tetrahedronAdjustor(tetrahedron: Tetrahedron, cornerValue: number[]): Tetrahedron {
    const [corner, value] = cornerValue
    const values = [tetrahedron.value0, tetrahedron.value1, tetrahedron.value2, tetrahedron.value3]
    values[corner] = value
    return newTetrahedron(values[0], values[1], values[2], values[3])
}

function tetrahedronTarget(): gear.Target<Tetrahedron> {
    return new gear.Target(newTetrahedron => {
        tetrahedron = newTetrahedron
        tetrahedronBuffer.float32Data = tetrahedronData(tetrahedron)
        contourSurfaceBuffer.float32Data = contourSurfaceData(tetrahedron, contourValue)
        draw()
    })
}

function contourValueTarget(): gear.Target<number> {
    return new gear.Target(newContourValue => {
        contourValue = newContourValue
        contourSurfaceBuffer.float32Data = contourSurfaceData(tetrahedron, contourValue)
        draw()
    })
}

function rotationTarget(): gear.Target<Mat<4>> {
    return new gear.Target(matrix => {
        matModel.data = mat4.columnMajorArray(matrix)
        draw()
    })
}

function lightPositionTarget(): gear.Target<gear.PointerPosition> {
    return new gear.Target<gear.PointerPosition>(([x, y]) => {
        lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)]
        draw()
    })
}

function contourColorData(contourValue: number) {
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

function newTetrahedron(field0: number, field1: number, field2: number, field3: number): Tetrahedron {
    const angle = 2 * Math.PI / 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const points: TetrahedronPoints = {
        point0: [        0,   1,          0],
        point1: [      sin, cos,          0],
        point2: [cos * sin, cos, -sin * sin],
        point3: [cos * sin, cos, +sin * sin]
    };
    const mat: Mat<4> = [
        [points.point0[0], points.point0[1], points.point0[2], 1],
        [points.point1[0], points.point1[1], points.point1[2], 1],
        [points.point2[0], points.point2[1], points.point2[2], 1],
        [points.point3[0], points.point3[1], points.point3[2], 1]
    ];
    const matInv = mat4.inverse(mat);
    const gradient = vec3.swizzle(vec4.prod([field0, field1, field2, field3], matInv), 0, 1, 2);
    const gradients: TetrahedronGradients = {
        gradient0: gradient,
        gradient1: gradient,
        gradient2: gradient,
        gradient3: gradient
    };
    const values: TetrahedronValues = {
        value0: field0,
        value1: field1,
        value2: field2,
        value3: field3
    }
    return {...points, ...gradients, ...values};
}

function tetrahedronData(tetrahedron: Tetrahedron): number[] {
    const normals = [
        normalFrom(tetrahedron.point3, tetrahedron.point2, tetrahedron.point1),
        normalFrom(tetrahedron.point2, tetrahedron.point3, tetrahedron.point0),
        normalFrom(tetrahedron.point1, tetrahedron.point0, tetrahedron.point3),
        normalFrom(tetrahedron.point0, tetrahedron.point1, tetrahedron.point2)
    ]
    const colors = [
        fieldColor(tetrahedron.value0),
        fieldColor(tetrahedron.value1),
        fieldColor(tetrahedron.value2),
        fieldColor(tetrahedron.value3)
    ]
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
    return tetrahedronVertexes.reduce<number[]>((a, v) => a.concat(...v), []);
}

function contourSurfaceData(tetrahedron: Tetrahedron, contourValue: number): Float32Array {
    const stack = ether.modules.mem.exports;
    const space = ether.modules.space.exports;
    const scalarField = ether.modules.scalarField.exports;
    if (!stack || !space || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Ether modules!")
    }
    stack.leave();
    stack.enter();
    const p0 = space.f64_vec4(tetrahedron.point0[0], tetrahedron.point0[1], tetrahedron.point0[2], 1)
    const g0 = space.f64_vec4(tetrahedron.gradient0[0], tetrahedron.gradient0[1], tetrahedron.gradient0[2], tetrahedron.value0);
    const p1 = space.f64_vec4(tetrahedron.point1[0], tetrahedron.point1[1], tetrahedron.point1[2], 1)
    const g1 = space.f64_vec4(tetrahedron.gradient1[0], tetrahedron.gradient1[1], tetrahedron.gradient1[2], tetrahedron.value1);
    const p2 = space.f64_vec4(tetrahedron.point2[0], tetrahedron.point2[1], tetrahedron.point2[2], 1)
    const g2 = space.f64_vec4(tetrahedron.gradient2[0], tetrahedron.gradient2[1], tetrahedron.gradient2[2], tetrahedron.value2);
    const p3 = space.f64_vec4(tetrahedron.point3[0], tetrahedron.point3[1], tetrahedron.point3[2], 1)
    const g3 = space.f64_vec4(tetrahedron.gradient3[0], tetrahedron.gradient3[1], tetrahedron.gradient3[2], tetrahedron.value3);
    const begin = scalarField.tessellateTetrahedron(contourValue, p0, p1, p2, p3);
    const end = stack.allocate8(0);
    const result = new Float32Array(stack.stack.buffer, begin, (end - begin) / 4);
    return result;
}

function fieldColor(fieldValue: number, alpha: number = 0.4): Vec<4> {
    return [(1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha];
}

function normalFrom(p1: Vec<3>, p2: Vec<3>, p3: Vec<3>) {
    const v12 = vec3.sub(p2, p1);
    const v23 = vec3.sub(p3, p2);
    return vec3.unit(vec3.cross(v12, v23));
}
