import * as aether from "aether"
import * as gear from "gear"
import { wgl } from "lumen"
import * as dragging from "../utils/dragging.js"

export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const toy = await Toy.create()
    const loop = gear.loops.newLoop(toy, Toy.descriptor)
    loop.run()
}

type ToyDescriptor = typeof Toy.descriptor

class Toy implements gear.loops.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        input: {
            pointers: {
                canvas: {
                    element: "canvas",
                }
            },
            keys: {
                contour: {
                    physicalKeys: [["KeyC"]],
                    virtualKeys: "#control-c",
                }, 
                rotation: {
                    physicalKeys: [["KeyR"]],
                    virtualKeys: "#control-r",
                }, 
                value1: {
                    physicalKeys: [["Digit1"]],
                    virtualKeys: "#control-1",
                }, 
                value2: {
                    physicalKeys: [["Digit2"]],
                    virtualKeys: "#control-2",
                }, 
                value3: {
                    physicalKeys: [["Digit3"]],
                    virtualKeys: "#control-3",
                }, 
                value4: {
                    physicalKeys: [["Digit4"]],
                    virtualKeys: "#control-4",
                }, 
                value5: {
                    physicalKeys: [["Digit5"]],
                    virtualKeys: "#control-5",
                }, 
                value6: {
                    physicalKeys: [["Digit6"]],
                    virtualKeys: "#control-6",
                }, 
                value7: {
                    physicalKeys: [["Digit7"]],
                    virtualKeys: "#control-7",
                }, 
                value8: {
                    physicalKeys: [["Digit8"]],
                    virtualKeys: "#control-8",
                }, 
            }
        },
        output: {
            canvases: {
                scene: {
                    element: "canvas"
                }
            },
            fps: {
                element: "fps-watch"
            },
            styling: {
                pressedButton: "pressed"
            },
        },
    } satisfies gear.loops.LoopDescriptor

    readonly contourTarget = gear.loops.draggingTarget(mapped(gear.property(this, "contourValue"), ([_, y]) => y), dragging.positionDragging)
    readonly rotationDragging = gear.loops.draggingTarget(gear.property(this, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, 4))
    readonly value1Target = gear.loops.draggingTarget(mapped(gear.property(this, "value1"), ([_, y]) => y), dragging.positionDragging)
    readonly value2Target = gear.loops.draggingTarget(mapped(gear.property(this, "value2"), ([_, y]) => y), dragging.positionDragging)
    readonly value3Target = gear.loops.draggingTarget(mapped(gear.property(this, "value3"), ([_, y]) => y), dragging.positionDragging)
    readonly value4Target = gear.loops.draggingTarget(mapped(gear.property(this, "value4"), ([_, y]) => y), dragging.positionDragging)
    readonly value5Target = gear.loops.draggingTarget(mapped(gear.property(this, "value5"), ([_, y]) => y), dragging.positionDragging)
    readonly value6Target = gear.loops.draggingTarget(mapped(gear.property(this, "value6"), ([_, y]) => y), dragging.positionDragging)
    readonly value7Target = gear.loops.draggingTarget(mapped(gear.property(this, "value7"), ([_, y]) => y), dragging.positionDragging)
    readonly value8Target = gear.loops.draggingTarget(mapped(gear.property(this, "value8"), ([_, y]) => y), dragging.positionDragging)

    private _value1 = -1
    private _value2 = -1
    private _value3 = -1
    private _value4 = -1
    private _value5 = -1
    private _value6 = -1
    private _value7 = -1
    private _value8 = -1
    private _cubeData: (data: Float32Array) => void = () => {}
    private _contourData: (data: Float32Array) => void = () => {}
    private _matProjectionData: (data: Float32Array) => void = () => {}
    private _matPositionsData: (data: Float32Array) => void = () => {}

    private cube: Cube = newCube(0, 0, 0, 0, 0, 0, 0, 0)
    private focalLength = Math.pow(2, 1.5)
    private matProjection = aether.mat4.projection(this.focalLength, 1, 0.1, 100)
    private matView = aether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0])
    private matPositions = aether.mat4.identity()

    constructor(
        private shaders: { vertexShaderCode: string, fragmentShaderCode: string }, 
        private scalarFieldInstance: aether.ScalarFieldInstance
    ) {
        this.modelMatrix = aether.mat4.identity()
        this.contourValue = 0.0
    }

    static async create() {
        const shaders = await gear.fetchTextFiles({
            vertexShaderCode: "vertexColors.vert",
            fragmentShaderCode: "vertexColors.frag"
        }, "/shaders")
        const scalarFieldModule = await aether.loadScalarFieldModule()
        const scalarFieldInstance = scalarFieldModule.newInstance()
        return new Toy(shaders, scalarFieldInstance)
    }

    inputWiring(inputs: gear.loops.LoopInputs<ToyDescriptor>): gear.loops.LoopInputWiring<ToyDescriptor> {
        return {
            pointers: {
                canvas: {
                     defaultDraggingTarget: this.rotationDragging
                }
            },
            keys: {
                contour: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.contourTarget },
                rotation: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.rotationDragging },
                value1: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.value1Target },
                value2: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.value2Target },
                value3: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.value3Target },
                value4: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.value4Target },
                value5: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.value5Target },
                value6: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.value6Target },
                value7: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.value7Target },
                value8: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.value8Target },
            }
        }
    }

    outputWiring(outputs: gear.loops.LoopOutputs<ToyDescriptor>): gear.loops.LoopOutputWiring<ToyDescriptor> {
        const context = wgl.Context.of(outputs.canvases.scene.element.id);

        const program = context.link(
            context.vertexShader(this.shaders.vertexShaderCode),
            context.fragmentShader(this.shaders.fragmentShaderCode)
        )
        program.use();

        const cubeBuffer = context.newAttributesBuffer(10 * 4);
        const contourSurfaceBuffer = context.newAttributesBuffer(6 * 4);

        const position = program.attribute("position");
        const normal = program.attribute("normal");
        const color = program.attribute("color");

        const matModel = program.uniform("matModel");
        const matView = program.uniform("matView");
        const matProjection = program.uniform("matProjection");

        const lightPosition = program.uniform("lightPosition");

        matModel.data = aether.mat4.columnMajorArray(this.matPositions)
        matView.data = aether.mat4.columnMajorArray(this.matView);
        matProjection.data = aether.mat4.columnMajorArray(this.matProjection);

        lightPosition.data = [2, 2, 2];

        const gl = context.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.CULL_FACE)
        gl.frontFace(gl.CCW)

        this._cubeData = (data: Float32Array) => cubeBuffer.data = data;
        this._contourData = (data: Float32Array) => contourSurfaceBuffer.data = data;
        this._matProjectionData = (data: Float32Array) => matProjection.data = data;
        this._matPositionsData = (data: Float32Array) => matModel.data = data;

        const drawCube = () => {
            position.pointTo(cubeBuffer, 0 * cubeBuffer.word);
            normal.pointTo(cubeBuffer, 3 * cubeBuffer.word);
            color.pointTo(cubeBuffer, 6 * cubeBuffer.word);
            gl.drawArrays(WebGL2RenderingContext.TRIANGLES, 0, cubeBuffer.data.length / 10);
        }

        const drawContour = () => {
            position.pointTo(contourSurfaceBuffer, 0 * contourSurfaceBuffer.word);
            normal.pointTo(contourSurfaceBuffer, 3 * contourSurfaceBuffer.word);
            color.setTo(...fieldColor(this.contourValue, 0.8));
            gl.drawArrays(WebGL2RenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
        }

        this.refreshCube()

        return {
            onRender: () => this.render(context, drawCube, drawContour),
            canvases: {
                scene: {
                    onResize: () => this.resize(context),
                }
            }
        }
    }

    animate(): void {
    }

    render(context: wgl.Context, drawCube: () => void, drawContour: () => void): void {
        const gl = context.gl
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.cullFace(gl.FRONT)
        drawCube()
        drawContour()

        gl.cullFace(gl.BACK)
        drawContour()
        drawCube()
    }

    resize(context: wgl.Context): void {
        const aspectRatio = context.canvas.width / context.canvas.height
        this.matProjection = aether.mat4.projection(2, 0.1, 100, aspectRatio)
        this._matProjectionData(new Float32Array(aether.mat4.columnMajorArray(this.matProjection)))
        context.gl.viewport(0, 0, context.canvas.width, context.canvas.height)
    }

    get projectionViewMatrix() {
        return aether.mat4.mul(this.matProjection, this.matView)
    }

    get modelMatrix() {
        return this.matPositions
    }

    set modelMatrix(m: aether.Mat4) {
        this.matPositions = m
        this._matPositionsData(new Float32Array(aether.mat4.columnMajorArray(m)))
    }

    get contourValue() {
        return this.scalarFieldInstance.contourValue
    }

    set contourValue(v: number) {
        this.scalarFieldInstance.contourValue = v
        this.refreshContour()
    }

    get value1() {
        return this._value1
    }

    set value1(v: number) {
        this._value1 = v
        this.refreshCube()
    }

    get value2() {
        return this._value2
    }

    set value2(v: number) {
        this._value2 = v
        this.refreshCube()
    }

    get value3() {
        return this._value3
    }

    set value3(v: number) {
        this._value3 = v
        this.refreshCube()
    }

    get value4() {
        return this._value4
    }

    set value4(v: number) {
        this._value4 = v
        this.refreshCube()
    }

    get value5() {
        return this._value5
    }

    set value5(v: number) {
        this._value5 = v
        this.refreshCube()
    }

    get value6() {
        return this._value6
    }

    set value6(v: number) {
        this._value6 = v
        this.refreshCube()
    }

    get value7() {
        return this._value7
    }

    set value7(v: number) {
        this._value7 = v
        this.refreshCube()
    }

    get value8() {
        return this._value8
    }

    set value8(v: number) {
        this._value8 = v
        this.refreshCube()
    }

    private refreshCube() {
        this.cube = newCube(this._value1, this._value2, this._value3, this._value4, this._value5, this._value6, this._value7, this._value8)
        this._cubeData(cubeData(this.cube))
        this.refreshContour()
    }

    private refreshContour() {
        this._contourData(contourSurfaceData(this.scalarFieldInstance, this.cube, this.contourValue))
    }

}

type Cube = CubePoints & CubeGradients & CubeValues

type CubePoints = {
    point0: aether.Vec<3>;
    point1: aether.Vec<3>;
    point2: aether.Vec<3>;
    point3: aether.Vec<3>;
    point4: aether.Vec<3>;
    point5: aether.Vec<3>;
    point6: aether.Vec<3>;
    point7: aether.Vec<3>;
}

type CubeGradients = {
    gradient0: aether.Vec<3>;
    gradient1: aether.Vec<3>;
    gradient2: aether.Vec<3>;
    gradient3: aether.Vec<3>;
    gradient4: aether.Vec<3>;
    gradient5: aether.Vec<3>;
    gradient6: aether.Vec<3>;
    gradient7: aether.Vec<3>;
}

type CubeValues = {
    value0: number;
    value1: number;
    value2: number;
    value3: number;
    value4: number;
    value5: number;
    value6: number;
    value7: number;
}

const points: CubePoints = {
    point0: [-1, -1, -1],
    point1: [-1, -1, +1],
    point2: [-1, +1, -1],
    point3: [-1, +1, +1],
    point4: [+1, -1, -1],
    point5: [+1, -1, +1],
    point6: [+1, +1, -1],
    point7: [+1, +1, +1],
};
const mat: aether.Mat<4> = [
    [points.point0[0], points.point0[1], points.point0[2], 1],
    [points.point1[0], points.point1[1], points.point1[2], 1],
    [points.point2[0], points.point2[1], points.point2[2], 1],
    [points.point3[0], points.point3[1], points.point3[2], 1]
];
const matInv = aether.mat4.inverse(mat);

function newCube(field0: number, field1: number, field2: number, field3: number, field4: number, field5: number, field6: number, field7: number): Cube {
    const gradients: CubeGradients = {
        gradient0: gradient(points.point0, field0, points.point4, field4, points.point2, field2, points.point1, field1),
        gradient1: gradient(points.point1, field1, points.point5, field5, points.point3, field3, points.point0, field0),
        gradient2: gradient(points.point2, field2, points.point6, field6, points.point0, field0, points.point3, field3),
        gradient3: gradient(points.point3, field3, points.point7, field7, points.point1, field1, points.point2, field2),
        gradient4: gradient(points.point4, field4, points.point0, field0, points.point6, field6, points.point5, field5),
        gradient5: gradient(points.point5, field5, points.point1, field1, points.point7, field7, points.point4, field4),
        gradient6: gradient(points.point6, field6, points.point2, field2, points.point4, field4, points.point7, field7),
        gradient7: gradient(points.point7, field7, points.point3, field3, points.point5, field5, points.point6, field6)
    };
    const values: CubeValues = {
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

function gradient(point: aether.Vec<3>, value: number, pointX: aether.Vec<3>, valueX: number, pointY: aether.Vec<3>, valueY: number, pointZ: aether.Vec<3>, valueZ: number) {
    return aether.vec3.add(
        aether.vec3.scale(aether.vec3.sub(point, pointX), value - valueX),
        aether.vec3.add(
            aether.vec3.scale(aether.vec3.sub(point, pointY), value - valueY),
            aether.vec3.scale(aether.vec3.sub(point, pointZ), value - valueZ)
        )
    )
}

function cubeData(cube: Cube): Float32Array {
    const normals = [
        [+0, +0, -1],
        [+0, +0, +1],
        [+0, -1, +0],
        [+0, +1, +0],
        [-1, +0, +0],
        [+1, +0, +0],
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
    return new Float32Array(vertexes.reduce<number[]>((a, v) => a.concat(...v), []));
}

function contourSurfaceData(scalarFieldInstance: aether.ScalarFieldInstance, cube: Cube, contourValue: number): Float32Array {
    const stack = scalarFieldInstance.mem;
    const space = scalarFieldInstance.space;
    const scalarField = scalarFieldInstance.scalarField;
    if (!stack || !space || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Aether modules!")
    }
    stack.leave();
    stack.enter();
    const p0 = space.f64_vec4(cube.point0[0], cube.point0[1], cube.point0[2], 1)
    space.f64_vec4(cube.gradient0[0], cube.gradient0[1], cube.gradient0[2], cube.value0);
    const p1 = space.f64_vec4(cube.point1[0], cube.point1[1], cube.point1[2], 1)
    space.f64_vec4(cube.gradient1[0], cube.gradient1[1], cube.gradient1[2], cube.value1);
    const p2 = space.f64_vec4(cube.point2[0], cube.point2[1], cube.point2[2], 1)
    space.f64_vec4(cube.gradient2[0], cube.gradient2[1], cube.gradient2[2], cube.value2);
    const p3 = space.f64_vec4(cube.point3[0], cube.point3[1], cube.point3[2], 1)
    space.f64_vec4(cube.gradient3[0], cube.gradient3[1], cube.gradient3[2], cube.value3);
    const p4 = space.f64_vec4(cube.point4[0], cube.point4[1], cube.point4[2], 1)
    space.f64_vec4(cube.gradient4[0], cube.gradient4[1], cube.gradient4[2], cube.value4);
    const p5 = space.f64_vec4(cube.point5[0], cube.point5[1], cube.point5[2], 1)
    space.f64_vec4(cube.gradient5[0], cube.gradient5[1], cube.gradient5[2], cube.value5);
    const p6 = space.f64_vec4(cube.point6[0], cube.point6[1], cube.point6[2], 1)
    space.f64_vec4(cube.gradient6[0], cube.gradient6[1], cube.gradient6[2], cube.value6);
    const p7 = space.f64_vec4(cube.point7[0], cube.point7[1], cube.point7[2], 1)
    space.f64_vec4(cube.gradient7[0], cube.gradient7[1], cube.gradient7[2], cube.value7);
    const begin = scalarField.tessellateCube(contourValue, p0, p1, p2, p3, p4, p5, p6, p7);
    const end = stack.allocate8(0);
    const result = new Float32Array(stack.stack.buffer, begin, (end - begin) / 4);
    return result;
}

function fieldColor(fieldValue: number, alpha = 0.4): aether.Vec<4> {
    const m = Math.max(1 + fieldValue, 1 - fieldValue)
    return [(1 + fieldValue) / m, 0, (1 - fieldValue) / m, alpha]
}

function mapped<A>(property: gear.Property<A>, mapper: gear.Mapper<gear.PointerPosition, A>): gear.Property<gear.PointerPosition> {
    const pos: [gear.PointerPosition] = [[0, 0]]
    return {
        getter: () => pos[0],
        setter: b => {
            pos[0] = b
            property.setter(mapper(b))
        }
    }
}
