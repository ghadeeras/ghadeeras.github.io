import * as Djee from "../djee/all.js"
import * as Space from "../space/all.js"
import * as Gear from "../gear/all.js"

let vertexShaderCode: string;
let fragmentShaderCode: string;

let context: Djee.Context;

let position: Djee.Attribute;
let normal: Djee.Attribute;
let color: Djee.Attribute;

let matModel: Djee.Uniform;
let lightPosition: Djee.Uniform;
let shininess: Djee.Uniform;
let fogginess: Djee.Uniform;

let tetrahedronBuffer: Djee.AttributesBuffer;
let contourSurfaceBuffer: Djee.AttributesBuffer;

let tetrahedron: Tetrahedron = newTetrahedron(1, -1, -1, -1);
let contourValue: number = 0;

type Tetrahedron = {
    point0: Space.Vector;
    gradient0: Space.Vector;
    value0: number;

    point1: Space.Vector;
    gradient1: Space.Vector;
    value1: number;

    point2: Space.Vector;
    gradient2: Space.Vector;
    value2: number;

    point3: Space.Vector;
    gradient3: Space.Vector;
    value3: number;
}

const viewMatrix = Space.Matrix.globalView(Space.vec(-2, 2, 5), Space.vec(0, 0, 0), Space.vec(0, 1, 0));
const projectionMatrix = Space.Matrix.project(2, 100, 1);

export function initTetrahedronDemo() {
    window.onload = () => Gear.load("/shaders", () => doInit(),
        ["vertexColors.vert", shader => vertexShaderCode = shader],
        ["vertexColors.frag", shader => fragmentShaderCode = shader]
    );
}

async function doInit() {
    await Space.initWaModules()
    context = Djee.Context.of("canvas-gl");

    const program = context.link(
        context.vertexShader(vertexShaderCode),
        context.fragmentShader(fragmentShaderCode)
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

    matModel.data = Space.Matrix.identity().asColumnMajorArray
    matView.data = viewMatrix.asColumnMajorArray;
    matProjection.data = projectionMatrix.asColumnMajorArray;

    lightPosition.data = [2, 2, 2];
    shininess.data = [1];
    fogginess.data = [0];

    const gl = context.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(1, 1, 1, 1);

    const canvas = Gear.elementEvents("canvas-gl");
    const transformer = new Gear.Transformer(canvas.element, projectionMatrix.by(viewMatrix))
    canvas.dragging.branch(
        flow => flow.map(d => d.pos).map(([x, y]) => Gear.pos(
            2 * (x - canvas.element.clientWidth / 2 ) / canvas.element.clientWidth, 
            2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
        )).branch(
            flow => flow.filter(selected("lightPosition")).to(lightPositionSink()),
            flow => flow.filter(selected("contourValue")).map(([x, y]) => y).to(contourValueSink()),
            flow => Gear.Flow.from(
                flow.filter(selected("value0")).map(([x, y]) => newTetrahedron(
                    y, 
                    tetrahedron.value1,
                    tetrahedron.value2,
                    tetrahedron.value3
                )),
                flow.filter(selected("value1")).map(([x, y]) => newTetrahedron(
                    tetrahedron.value0, 
                    y,
                    tetrahedron.value2,
                    tetrahedron.value3
                )),
                flow.filter(selected("value2")).map(([x, y]) => newTetrahedron(
                    tetrahedron.value0, 
                    tetrahedron.value1,
                    y,
                    tetrahedron.value3
                )),
                flow.filter(selected("value3")).map(([x, y]) => newTetrahedron(
                    tetrahedron.value0, 
                    tetrahedron.value1,
                    tetrahedron.value2,
                    y
                ))
            ).to(tetrahedronSink())
        ),
        flow => flow
            .filter(selected("rotation"))
            .map(transformer.rotation)
            .to(rotationSink())
    )
}

function tetrahedronSink(): Gear.Sink<Tetrahedron> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(newTetrahedron(1, -1, -1, -1))
        .producer(newTetrahedron => {
            tetrahedron = newTetrahedron;
            tetrahedronBuffer.float32Data = tetrahedronData(tetrahedron);
            contourSurfaceBuffer.data = contourSurfaceData(tetrahedron, contourValue);
            draw();
        })
    )
}

function contourValueSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(0)
        .producer(newContourValue => {
            contourValue = newContourValue;
            contourSurfaceBuffer.data = contourSurfaceData(tetrahedron, contourValue);
            draw();
        })
    )
}

function rotationSink(): Gear.Sink<Space.Matrix> {
    return Gear.sinkFlow(flow => flow.defaultsTo(Space.Matrix.identity()).producer(matrix => {
        matModel.data = matrix.asColumnMajorArray;
        draw();
    }));
}

function lightPositionSink(): Gear.Sink<Gear.PointerPosition> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo([0.5, 0.5])
        .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
        .producer(([x, y]) => {
            lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)];
            draw();
        })
    );
}

function selected<T>(value: string): Gear.Predicate<T> {
    const mouseBinding = document.getElementById("mouse-binding") as HTMLInputElement;
    return () => mouseBinding.value == value;
}

function contourColorData(contourValue: number) {
    return fieldColor(contourValue, 0.8).coordinates;
}

function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);

    position.pointTo(tetrahedronBuffer, 0 * tetrahedronBuffer.word);
    normal.pointTo(tetrahedronBuffer, 3 * tetrahedronBuffer.word);
    color.pointTo(tetrahedronBuffer, 6 * tetrahedronBuffer.word);
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, tetrahedronBuffer.data.length / 10);

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
    const points = {
        point0: Space.vec(        0,   1,          0),
        point1: Space.vec(      sin, cos,          0),
        point2: Space.vec(cos * sin, cos, -sin * sin),
        point3: Space.vec(cos * sin, cos, +sin * sin)
    };
    const mat = Space.mat(
        Space.vec(...points.point0.coordinates, 1),
        Space.vec(...points.point1.coordinates, 1),
        Space.vec(...points.point2.coordinates, 1),
        Space.vec(...points.point3.coordinates, 1)
    );
    const matInv = mat.inverse;
    const gradient = Space.vec(field0, field1, field2, field3).prod(matInv).swizzle(0, 1, 2);
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
    return tetrahedronVertexes.reduce<number[]>((a, v) => a.concat(...v.coordinates), []);
}

function contourSurfaceData(tetrahedron: Tetrahedron, contourValue: number): Float32Array {
    const stack = Space.modules.mem.exports;
    const space = Space.modules.space.exports;
    const scalarField = Space.modules.scalarField.exports;
    if (!stack || !space || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Space modules!")
    }
    stack.leave();
    stack.enter();
    const p0 = space.f64_vec4(tetrahedron.point0.coordinates[0], tetrahedron.point0.coordinates[1], tetrahedron.point0.coordinates[2], 1)
    const g0 = space.f64_vec4(tetrahedron.gradient0.coordinates[0], tetrahedron.gradient0.coordinates[1], tetrahedron.gradient0.coordinates[2], tetrahedron.value0);
    const p1 = space.f64_vec4(tetrahedron.point1.coordinates[0], tetrahedron.point1.coordinates[1], tetrahedron.point1.coordinates[2], 1)
    const g1 = space.f64_vec4(tetrahedron.gradient1.coordinates[0], tetrahedron.gradient1.coordinates[1], tetrahedron.gradient1.coordinates[2], tetrahedron.value1);
    const p2 = space.f64_vec4(tetrahedron.point2.coordinates[0], tetrahedron.point2.coordinates[1], tetrahedron.point2.coordinates[2], 1)
    const g2 = space.f64_vec4(tetrahedron.gradient2.coordinates[0], tetrahedron.gradient2.coordinates[1], tetrahedron.gradient2.coordinates[2], tetrahedron.value2);
    const p3 = space.f64_vec4(tetrahedron.point3.coordinates[0], tetrahedron.point3.coordinates[1], tetrahedron.point3.coordinates[2], 1)
    const g3 = space.f64_vec4(tetrahedron.gradient3.coordinates[0], tetrahedron.gradient3.coordinates[1], tetrahedron.gradient3.coordinates[2], tetrahedron.value3);
    const begin = scalarField.tessellateTetrahedron(contourValue, p0, p1, p2, p3);
    const end = stack.allocate8(0);
    const result = new Float32Array(stack.stack.buffer, begin, (end - begin) / 4);
    return result;
}

function fieldColor(fieldValue: number, alpha: number = 0.4): Space.Vector {
    return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha);
}

function normalFrom(p1: Space.Vector, p2: Space.Vector, p3: Space.Vector) {
    const v12 = p2.minus(p1);
    const v23 = p3.minus(p2);
    return v12.cross(v23).unit;
}
