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

    private _value1 =  1
    private _value2 = -1
    private _value3 = -1
    private _value4 = -1
    private _tetrahedronData: (data: Float32Array) => void = () => {}
    private _contourData: (data: Float32Array) => void = () => {}
    private _matProjectionData: (data: Float32Array) => void = () => {}
    private _matPositionsData: (data: Float32Array) => void = () => {}

    private tetrahedron: Tetrahedron = newTetrahedron(0, 0, 0, 0)
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

        const tetrahedronBuffer = context.newAttributesBuffer(10 * 4);
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
        gl.frontFace(gl.CCW)

        this._tetrahedronData = (data: Float32Array) => tetrahedronBuffer.data = data;
        this._contourData = (data: Float32Array) => contourSurfaceBuffer.data = data;
        this._matProjectionData = (data: Float32Array) => matProjection.data = data;
        this._matPositionsData = (data: Float32Array) => matModel.data = data;

        const drawTetrahedron = () => {
            position.pointTo(tetrahedronBuffer, 0 * tetrahedronBuffer.word);
            normal.pointTo(tetrahedronBuffer, 3 * tetrahedronBuffer.word);
            color.pointTo(tetrahedronBuffer, 6 * tetrahedronBuffer.word);
            gl.drawArrays(WebGL2RenderingContext.TRIANGLES, 0, tetrahedronBuffer.data.length / 10);
        }

        const drawContour = () => {
            position.pointTo(contourSurfaceBuffer, 0 * contourSurfaceBuffer.word);
            normal.pointTo(contourSurfaceBuffer, 3 * contourSurfaceBuffer.word);
            color.setTo(...fieldColor(this.contourValue, 1.0));
            gl.drawArrays(WebGL2RenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
        }

        this.refreshTetrahedron()

        return {
            onRender: () => this.render(context, drawTetrahedron, drawContour),
            canvases: {
                scene: {
                    onResize: () => this.resize(context),
                }
            }
        }
    }

    animate(): void {
    }

    render(context: wgl.Context, drawTetrahedron: () => void, drawContour: () => void): void {
        const gl = context.gl
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.FRONT)
        drawTetrahedron()

        gl.disable(gl.CULL_FACE)
        drawContour()

        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.BACK)
        drawTetrahedron()
    }

    resize(context: wgl.Context): void {
        const aspectRatio = context.canvas.width / context.canvas.height
        this.matProjection = aether.mat4.projection(4, 0.1, 100, aspectRatio)
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
        this.refreshTetrahedron()
    }

    get value2() {
        return this._value2
    }

    set value2(v: number) {
        this._value2 = v
        this.refreshTetrahedron()
    }

    get value3() {
        return this._value3
    }

    set value3(v: number) {
        this._value3 = v
        this.refreshTetrahedron()
    }

    get value4() {
        return this._value4
    }

    set value4(v: number) {
        this._value4 = v
        this.refreshTetrahedron()
    }

    private refreshTetrahedron() {
        this.tetrahedron = newTetrahedron(this._value1, this._value2, this._value3, this._value4)
        this._tetrahedronData(tetrahedronData(this.tetrahedron))
        this.refreshContour()
    }

    private refreshContour() {
        this._contourData(contourSurfaceData(this.scalarFieldInstance, this.tetrahedron, this.contourValue))
    }

}

type Tetrahedron = TetrahedronPoints & TetrahedronGradients & TetrahedronValues

type TetrahedronPoints = {
    point0: aether.Vec<3>;
    point1: aether.Vec<3>;
    point2: aether.Vec<3>;
    point3: aether.Vec<3>;
}

type TetrahedronGradients = {
    gradient0: aether.Vec<3>;
    gradient1: aether.Vec<3>;
    gradient2: aether.Vec<3>;
    gradient3: aether.Vec<3>;
}

type TetrahedronValues = {
    value0: number;
    value1: number;
    value2: number;
    value3: number;
}

const angle = 2 * Math.PI / 3;
const cos = Math.cos(angle);
const sin = Math.sin(angle);
const points: TetrahedronPoints = {
    point0: [        0,   1,          0],
    point1: [      sin, cos,          0],
    point2: [cos * sin, cos, -sin * sin],
    point3: [cos * sin, cos, +sin * sin]
};
const mat: aether.Mat<4> = [
    [points.point0[0], points.point0[1], points.point0[2], 1],
    [points.point1[0], points.point1[1], points.point1[2], 1],
    [points.point2[0], points.point2[1], points.point2[2], 1],
    [points.point3[0], points.point3[1], points.point3[2], 1]
];
const matInv = aether.mat4.inverse(mat);

function newTetrahedron(field0: number, field1: number, field2: number, field3: number): Tetrahedron {
    const gradient = aether.vec3.swizzle(aether.vec4.prod([field0, field1, field2, field3], matInv), 0, 1, 2);
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

function tetrahedronData(tetrahedron: Tetrahedron): Float32Array {
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
    return new Float32Array(tetrahedronVertexes.reduce<number[]>((a, v) => a.concat(...v), []));
}

function contourSurfaceData(scalarFieldInstance: aether.ScalarFieldInstance, tetrahedron: Tetrahedron, contourValue: number): Float32Array {
    const stack = scalarFieldInstance.mem;
    const space = scalarFieldInstance.space;
    const scalarField = scalarFieldInstance.scalarField;
    if (!stack || !space || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Aether modules!")
    }
    stack.leave();
    stack.enter();
    const p0 = space.f64_vec4(tetrahedron.point0[0], tetrahedron.point0[1], tetrahedron.point0[2], 1)
    space.f64_vec4(tetrahedron.gradient0[0], tetrahedron.gradient0[1], tetrahedron.gradient0[2], tetrahedron.value0);
    const p1 = space.f64_vec4(tetrahedron.point1[0], tetrahedron.point1[1], tetrahedron.point1[2], 1)
    space.f64_vec4(tetrahedron.gradient1[0], tetrahedron.gradient1[1], tetrahedron.gradient1[2], tetrahedron.value1);
    const p2 = space.f64_vec4(tetrahedron.point2[0], tetrahedron.point2[1], tetrahedron.point2[2], 1)
    space.f64_vec4(tetrahedron.gradient2[0], tetrahedron.gradient2[1], tetrahedron.gradient2[2], tetrahedron.value2);
    const p3 = space.f64_vec4(tetrahedron.point3[0], tetrahedron.point3[1], tetrahedron.point3[2], 1)
    space.f64_vec4(tetrahedron.gradient3[0], tetrahedron.gradient3[1], tetrahedron.gradient3[2], tetrahedron.value3);
    const begin = scalarField.tessellateTetrahedron(contourValue, p0, p1, p2, p3);
    const end = stack.allocate8(0);
    const result = new Float32Array(stack.stack.buffer, begin, (end - begin) / 4);
    return result;
}

function fieldColor(fieldValue: number, alpha = 0.5): aether.Vec<4> {
    const m = Math.max(1 + fieldValue, 1 - fieldValue)
    return [(1 + fieldValue) / m, 0, (1 - fieldValue) / m, alpha]
}

function normalFrom(p1: aether.Vec<3>, p2: aether.Vec<3>, p3: aether.Vec<3>) {
    const v12 = aether.vec3.sub(p2, p1);
    const v23 = aether.vec3.sub(p3, p2);
    return aether.vec3.unit(aether.vec3.cross(v12, v23));
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
