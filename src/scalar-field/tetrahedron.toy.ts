import * as aether from "aether"
import * as gear from "gear"
import * as gpu from "lumen"
import * as dragging from "../utils/dragging.js"
import { glWebGPU } from "webgxx"

export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const toy = await Toy.create()
    const loop = gear.loops.newLoop(toy, Toy.descriptor)
    loop.run()
}

const vertexStruct = gpu.vertex({ 
    position: gpu.f32.x3,
    normal: gpu.f32.x3,
    color: gpu.f32.x4,
})

const vertexGeometry = gpu.vertex({ 
    position: gpu.f32.x3,
    normal: gpu.f32.x3,
})

const uniformsStruct = gpu.struct({
    matModel: gpu.mat4x4,
    matView: gpu.mat4x4,
    matProjection: gpu.mat4x4,
    lightPosition: gpu.f32.x3,
});

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
    readonly rotationDragging = gear.loops.draggingTarget(gear.property(this, "matModel"), dragging.RotationDragging.dragger(() => this.matView))
    readonly value1Target = gear.loops.draggingTarget(mapped(gear.property(this, "value1"), ([_, y]) => y), dragging.positionDragging)
    readonly value2Target = gear.loops.draggingTarget(mapped(gear.property(this, "value2"), ([_, y]) => y), dragging.positionDragging)
    readonly value3Target = gear.loops.draggingTarget(mapped(gear.property(this, "value3"), ([_, y]) => y), dragging.positionDragging)
    readonly value4Target = gear.loops.draggingTarget(mapped(gear.property(this, "value4"), ([_, y]) => y), dragging.positionDragging)

    private _value1 =  1
    private _value2 = -1
    private _value3 = -1
    private _value4 = -1

    private tetrahedron: Tetrahedron = newTetrahedron(0, 0, 0, 0)
    private focalLength = Math.pow(2, 1.5)
    private matView = aether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0])

    private tetrahedronBuffer: gpu.DataBuffer
    private contourSurfaceBuffer: gpu.DataBuffer
    private uniformsBuffer: gpu.SyncBuffer
    private tetrahedronVerticesCount = 0
    private contourSurfaceVerticesCount = 0

    private uniformsGroup: gpu.BindGroup

    private backFacePipeline: GPURenderPipeline
    private frontFacePipeline: GPURenderPipeline
    private contourPipeline: GPURenderPipeline

    constructor(
        private device: gpu.Device,
        private canvas: gpu.Canvas,
        private shaders: { vertexShader: gpu.ShaderModule, fragmentShader: gpu.ShaderModule }, 
        private scalarFieldInstance: aether.ScalarFieldInstance
    ) {
        const groupLayout = this.device.groupLayout({
            data: gpu.uniform(uniformsStruct).asEntry(0, "VERTEX")
        })
        const layout = this.device.pipelineLayout({
            uniforms: groupLayout.asEntry(0)
        }).wrapped
        const vertex = this.shaders.vertexShader.vertexState("main", [vertexStruct.asBufferLayout()])
        const fragment = this.shaders.fragmentShader.fragmentState("main", [{
            format: this.canvas.format,
            blend: {
                color: {
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add"
                },
                alpha: {
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add"
                },
            }
        }])
        function primitive(cullMode: GPUCullMode): GPUPrimitiveState {
            return {
                topology: "triangle-list",
                frontFace: "ccw",
                cullMode,
            }
        }
        this.backFacePipeline = this.device.wrapped.createRenderPipeline({
            layout, vertex, fragment, primitive: primitive("front")
        })
        this.frontFacePipeline = this.device.wrapped.createRenderPipeline({
            layout, vertex, fragment, primitive: primitive("back")
        })
        this.contourPipeline = this.device.wrapped.createRenderPipeline({
            layout, vertex, fragment, primitive: primitive("none")
        })

        this.tetrahedronBuffer = this.device.dataBuffer({
            usage: ["VERTEX"],
            size: vertexStruct.struct.size
        });
        this.contourSurfaceBuffer = this.device.dataBuffer({
            usage: ["VERTEX"],
            size: vertexStruct.struct.size
        });
        this.uniformsBuffer = this.device.syncBuffer({
            usage: ["UNIFORM"],
            data: uniformsStruct.view([{
                matModel: aether.mat4.identity(),
                matView: this.matView,
                matProjection: aether.mat4.projection(this.focalLength, 1, 0.1, 100),
                lightPosition: [2, 2, 2],
            }])
        })
        this.uniformsGroup = groupLayout.bindGroup({
            data: this.uniformsBuffer
        })
        this.refreshTetrahedron()
    }

    static async create() {
        const shaders = await gear.fetchTextFiles({
            vertexShaderCode: "vertexColors.vert",
            fragmentShaderCode: "vertexColors.frag"
        }, "/shaders")
        const canvasElement = document.getElementById(Toy.descriptor.output.canvases.scene.element) as HTMLCanvasElement
        const webgpuAPI = glWebGPU(canvasElement)
        const device = await gpu.Device.instance({}, webgpuAPI)
        const canvas = device.canvas(canvasElement, 4)
        const shaderModules = {
            vertexShader: await device.shaderModule({ code: shaders.vertexShaderCode }),
            fragmentShader: await device.shaderModule({ code: shaders.fragmentShaderCode }),
        }

        const scalarFieldModule = await aether.loadScalarFieldModule()
        const scalarFieldInstance = scalarFieldModule.newInstance()
        scalarFieldInstance.contourValue = 0.0

        return new Toy(device, canvas, shaderModules, scalarFieldInstance)
    }

    private set tetrahedronData(data: Float32Array) {
        this.tetrahedronBuffer.setData(new DataView(data.buffer, data.byteOffset, data.byteLength));
        this.tetrahedronVerticesCount = data.byteLength / vertexStruct.struct.stride
    }

    private set contourData(data: Float32Array) {
        this.contourSurfaceBuffer.setData(new DataView(data.buffer, data.byteOffset, data.byteLength));
        this.contourSurfaceVerticesCount = data.byteLength / vertexStruct.struct.stride
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
        return {
            onRender: () => this.render(),
            canvases: {
                scene: {
                    onResize: () => this.resize(),
                }
            }
        }
    }

    animate(): void {
    }

    render(): void {
        this.device.enqueueCommands("render", encoder => {
            encoder.renderPass({
                colorAttachments: [ this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })]
            }, pass => {
                pass.setBindGroup(0, this.uniformsGroup.wrapped)

                pass.setVertexBuffer(0, this.tetrahedronBuffer.wrapped)
                pass.setPipeline(this.backFacePipeline)
                pass.draw(this.tetrahedronVerticesCount)

                pass.setVertexBuffer(0, this.contourSurfaceBuffer.wrapped)
                pass.setPipeline(this.contourPipeline)
                pass.draw(this.contourSurfaceVerticesCount)

                pass.setVertexBuffer(0, this.tetrahedronBuffer.wrapped)
                pass.setPipeline(this.frontFacePipeline)
                pass.draw(this.tetrahedronVerticesCount)
            })

        })
    }

    resize(): void {
        const aspectRatio = this.canvas.element.width / this.canvas.element.height
        this.matProjection = aether.mat4.projection(4, 0.1, 100, aspectRatio)
        this.canvas.resize()
    }

    get projectionViewMatrix() {
        return aether.mat4.mul(this.matProjection, this.matView)
    }

    set matProjection(m: aether.Mat4) {
        this.uniformsBuffer.set(uniformsStruct.members.matProjection, m);
    }

    get matModel() {
        return this.uniformsBuffer.get(uniformsStruct.members.matModel);
    }

    set matModel(m: aether.Mat4) {
        this.uniformsBuffer.set(uniformsStruct.members.matModel, m);
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
        this.tetrahedronData = tetrahedronData(this.tetrahedron)
        this.refreshContour()
    }

    private refreshContour() {
        const data = contourSurfaceData(this.scalarFieldInstance, this.tetrahedron, this.contourValue)
        const verticesCount = data.byteLength / vertexGeometry.struct.stride
        const color = fieldColor(this.contourValue, 1)
        const vertices = vertexGeometry.struct.readMulti(new DataView(data.buffer, data.byteOffset, data.byteLength), 0, verticesCount).map(v => ({
            ...v, color
        }))
        this.contourData = new Float32Array(vertexStruct.struct.view(vertices).buffer)
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

function mapped<A>(property: gear.Property<A>, mapper: gear.Mapper<gear.loops.PointerPosition, A>): gear.Property<gear.loops.PointerPosition> {
    const pos: [gear.loops.PointerPosition] = [[0, 0]]
    return {
        getter: () => pos[0],
        setter: b => {
            pos[0] = b
            property.setter(mapper(b))
        }
    }
}
