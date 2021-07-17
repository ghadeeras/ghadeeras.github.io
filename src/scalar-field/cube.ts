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

let cubeBuffer: Djee.AttributesBuffer;
let contourSurfaceBuffer: Djee.AttributesBuffer;

let cube: Cube = newCube(-1, -1, -1, -1, -1, -1, -1, -1);
let contourValue: number = 0;

type Cube = {
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

    point4: Space.Vector;
    gradient4: Space.Vector;
    value4: number;

    point5: Space.Vector;
    gradient5: Space.Vector;
    value5: number;

    point6: Space.Vector;
    gradient6: Space.Vector;
    value6: number;

    point7: Space.Vector;
    gradient7: Space.Vector;
    value7: number;
}

const viewMatrix = Space.Matrix.globalView(Space.vec(-2, 2, 6), Space.vec(0, 0, 0), Space.vec(0, 1, 0));
const projectionMatrix = Space.Matrix.project(2, 100, 1);

export function initCubeDemo() {
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
                flow.filter(selected("value0")).map(([x, y]) => newCube(
                    y, 
                    cube.value1,
                    cube.value2,
                    cube.value3,
                    cube.value4,
                    cube.value5,
                    cube.value6,
                    cube.value7
                )),
                flow.filter(selected("value1")).map(([x, y]) => newCube(
                    cube.value0, 
                    y,
                    cube.value2,
                    cube.value3,
                    cube.value4,
                    cube.value5,
                    cube.value6,
                    cube.value7
                )),
                flow.filter(selected("value2")).map(([x, y]) => newCube(
                    cube.value0, 
                    cube.value1,
                    y,
                    cube.value3,
                    cube.value4,
                    cube.value5,
                    cube.value6,
                    cube.value7
                )),
                flow.filter(selected("value3")).map(([x, y]) => newCube(
                    cube.value0, 
                    cube.value1,
                    cube.value2,
                    y,
                    cube.value4,
                    cube.value5,
                    cube.value6,
                    cube.value7
                )),
                flow.filter(selected("value4")).map(([x, y]) => newCube(
                    cube.value0, 
                    cube.value1,
                    cube.value2,
                    cube.value3,
                    y,
                    cube.value5,
                    cube.value6,
                    cube.value7
                )),
                flow.filter(selected("value5")).map(([x, y]) => newCube(
                    cube.value0, 
                    cube.value1,
                    cube.value2,
                    cube.value3,
                    cube.value4,
                    y,
                    cube.value6,
                    cube.value7
                )),
                flow.filter(selected("value6")).map(([x, y]) => newCube(
                    cube.value0, 
                    cube.value1,
                    cube.value2,
                    cube.value3,
                    cube.value4,
                    cube.value5,
                    y,
                    cube.value7
                )),
                flow.filter(selected("value7")).map(([x, y]) => newCube(
                    cube.value0, 
                    cube.value1,
                    cube.value2,
                    cube.value3,
                    cube.value4,
                    cube.value5,
                    cube.value6,
                    y
                ))
            ).to(cubeSink())
        ),
        flow => flow
            .filter(selected("rotation"))
            .map(transformer.rotation)
            .to(rotationSink())
    );
}

function cubeSink(): Gear.Sink<Cube> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(newCube(-1, -1, -1, -1, -1, -1, -1, -1))
        .producer(newCube => {
            cube = newCube;
            cubeBuffer.float32Data = cubeData(cube);
            contourSurfaceBuffer.data = contourSurfaceData(cube, contourValue);
            draw();
        })
    )
}

function contourValueSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(0)
        .producer(newContourValue => {
            contourValue = newContourValue;
            contourSurfaceBuffer.data = contourSurfaceData(cube, contourValue);
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

    const unit = contourSurfaceBuffer.word

    position.pointTo(cubeBuffer, 0 * cubeBuffer.word);
    normal.pointTo(cubeBuffer, 3 * cubeBuffer.word);
    color.pointTo(cubeBuffer, 6 * cubeBuffer.word);
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, cubeBuffer.data.length / 10);

    position.pointTo(contourSurfaceBuffer, 0 * contourSurfaceBuffer.word);
    normal.pointTo(contourSurfaceBuffer, 3 * contourSurfaceBuffer.word);
    color.setTo(...contourColorData(contourValue));
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);

    gl.flush();
}

function newCube(field0: number, field1: number, field2: number, field3: number, field4: number, field5: number, field6: number, field7: number): Cube {
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
    }
    return {...points, ...gradients, ...values};
}

function gradient(point: Space.Vector, value: number, pointX: Space.Vector, valueX: number, pointY: Space.Vector, valueY: number, pointZ: Space.Vector, valueZ: number) {
    return point.minus(pointX).scale(value - valueX)
        .plus(point.minus(pointY).scale(value - valueY))
        .plus(point.minus(pointZ).scale(value - valueZ))
}

function cubeData(cube: Cube): number[] {
    const normals = [
        Space.vec(+0, +0, -1),
        Space.vec(+0, +0, +1),
        Space.vec(+0, -1, +0),
        Space.vec(+0, +1, +0),
        Space.vec(-1, +0, +0),
        Space.vec(+1, +0, +0),
    ]
    const colors = [
        fieldColor(cube.value0),
        fieldColor(cube.value1),
        fieldColor(cube.value2),
        fieldColor(cube.value3),
        fieldColor(cube.value4),
        fieldColor(cube.value5),
        fieldColor(cube.value6),
        fieldColor(cube.value7),
    ]
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
    return vertexes.reduce<number[]>((a, v) => a.concat(...v.coordinates), []);
}

function contourSurfaceData(cube: Cube, contourValue: number): Float32Array {
    const stack = Space.modules.mem.exports;
    const space = Space.modules.space.exports;
    const scalarField = Space.modules.scalarField.exports;
    if (!stack || !space || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Space modules!")
    }
    stack.leave();
    stack.enter();
    const p0 = space.f64_vec4(cube.point0.coordinates[0], cube.point0.coordinates[1], cube.point0.coordinates[2], 1)
    const g0 = space.f64_vec4(cube.gradient0.coordinates[0], cube.gradient0.coordinates[1], cube.gradient0.coordinates[2], cube.value0);
    const p1 = space.f64_vec4(cube.point1.coordinates[0], cube.point1.coordinates[1], cube.point1.coordinates[2], 1)
    const g1 = space.f64_vec4(cube.gradient1.coordinates[0], cube.gradient1.coordinates[1], cube.gradient1.coordinates[2], cube.value1);
    const p2 = space.f64_vec4(cube.point2.coordinates[0], cube.point2.coordinates[1], cube.point2.coordinates[2], 1)
    const g2 = space.f64_vec4(cube.gradient2.coordinates[0], cube.gradient2.coordinates[1], cube.gradient2.coordinates[2], cube.value2);
    const p3 = space.f64_vec4(cube.point3.coordinates[0], cube.point3.coordinates[1], cube.point3.coordinates[2], 1)
    const g3 = space.f64_vec4(cube.gradient3.coordinates[0], cube.gradient3.coordinates[1], cube.gradient3.coordinates[2], cube.value3);
    const p4 = space.f64_vec4(cube.point4.coordinates[0], cube.point4.coordinates[1], cube.point4.coordinates[2], 1)
    const g4 = space.f64_vec4(cube.gradient4.coordinates[0], cube.gradient4.coordinates[1], cube.gradient4.coordinates[2], cube.value4);
    const p5 = space.f64_vec4(cube.point5.coordinates[0], cube.point5.coordinates[1], cube.point5.coordinates[2], 1)
    const g5 = space.f64_vec4(cube.gradient5.coordinates[0], cube.gradient5.coordinates[1], cube.gradient5.coordinates[2], cube.value5);
    const p6 = space.f64_vec4(cube.point6.coordinates[0], cube.point6.coordinates[1], cube.point6.coordinates[2], 1)
    const g6 = space.f64_vec4(cube.gradient6.coordinates[0], cube.gradient6.coordinates[1], cube.gradient6.coordinates[2], cube.value6);
    const p7 = space.f64_vec4(cube.point7.coordinates[0], cube.point7.coordinates[1], cube.point7.coordinates[2], 1)
    const g7 = space.f64_vec4(cube.gradient7.coordinates[0], cube.gradient7.coordinates[1], cube.gradient7.coordinates[2], cube.value7);
    const begin = scalarField.tessellateCube(contourValue, p0, p1, p2, p3, p4, p5, p6, p7);
    const end = stack.allocate8(0);
    const result = new Float32Array(stack.stack.buffer, begin, (end - begin) / 4);
    return result;
}

function fieldColor(fieldValue: number, alpha: number = 0.4): Space.Vector {
    return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha);
}
