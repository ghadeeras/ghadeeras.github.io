import * as aether from 'aether';
import * as gear from 'gear';
import { gpu } from "lumen"
import { glWebGPU } from 'webgxx';

const uniformsStruct = gpu.struct({
    matModel: gpu.f32.x4.x4,
    matView: gpu.f32.x4.x4,
    matProjection: gpu.f32.x4.x4,
    lightPosition: gpu.f32.x3,
    color: gpu.f32.x3,
    shininess: gpu.f32,
    twist: gpu.f32,
    fogginess: gpu.f32,
})

const vertexStruct = gpu.vertex({ 
    position: gpu.f32.x3, 
    normal: gpu.f32.x3 
})

const matricesStruct = gpu.mat4x4.clone(0, 256, false)

const projection = new aether.PerspectiveProjection(1, null, false, false)

export class View {

    private buffer: gpu.DataBuffer;
    
    private uniformsBuffer: gpu.SyncBuffer;
    private uniformsGroup: GPUBindGroup;

    private matricesBuffer: gpu.DataBuffer;
    private matricesGroup: GPUBindGroup;
    private _matrices: aether.Mat4[] = [aether.mat4.identity()]

    private depthTexture: gpu.Texture

    private pipeline: GPURenderPipeline

    constructor(private canvas: gpu.Canvas, private device: gpu.Device,  private vertexShader: gpu.ShaderModule, private fragmentShader: gpu.ShaderModule) {
        this.buffer = device.dataBuffer({
            usage: ["VERTEX"],
            data: new DataView(new Float32Array(this.vertexData()).buffer)
        });

        this.matricesBuffer = device.dataBuffer({
            usage: ["UNIFORM"],
            data: matricesStruct.view(this._matrices)
        });

        this.depthTexture = canvas.depthTexture()

        this.pipeline = device.wrapped.createRenderPipeline({
            layout: "auto",
            vertex: vertexShader.vertexState("main", [
                vertexStruct.asBufferLayout()
            ]),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32",
            },
            fragment: fragmentShader.fragmentState("main", [canvas]),
            depthStencil: this.depthTexture.depthState(),
        });

        this.uniformsBuffer = device.syncBuffer({
            usage: ["UNIFORM"],
            data: uniformsStruct.view([{
                matModel: aether.mat4.identity(),
                matView: aether.mat4.lookAt([-1, 2, 10], [0, 1, 0]),
                matProjection: projection.matrix(2, this.canvas.element.width / this.canvas.element.height),
                lightPosition: [-8, 8, 8],
                color: [0.8, 0.8, 0.8],
                shininess: 1,
                twist: 0,
                fogginess: 0,
            }])
        })
        this.uniformsGroup = device.wrapped.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: this.uniformsBuffer.asBindingResource()
            }]
        })
        this.matricesGroup = this.newMatricesGroup()
    }

    private newMatricesGroup(): GPUBindGroup {
        return this.device.wrapped.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [{
                binding: 0,
                resource: this.matricesBuffer.asBindingResource()
            }]
        });
    }

    private vertexData(): number[] {
        const d = 2 * (1 - Math.SQRT1_2) / (1 + Math.SQRT1_2);
        const radiusBottom = (1 + d / 2) / 4;
        const radiusTop = (1 - d / 2) / 4;
        const height = 2
        const stacks = 8;
        const slices = 12;
        return cone(radiusTop, radiusBottom, height, stacks, slices);
    }

    draw() {
        this.device.enqueueCommands("draw", encoder => {
            encoder.renderPass({ 
                colorAttachments: [this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
                depthStencilAttachment: this.depthTexture.createView().depthAttachment()
            }, pass => {
                pass.setPipeline(this.pipeline)
                pass.setVertexBuffer(0, this.buffer.wrapped)
                pass.setBindGroup(0, this.uniformsGroup)
                for (const [index, matrix] of this._matrices.entries()) {
                    pass.setBindGroup(1, this.matricesGroup, [index * matricesStruct.stride])
                    pass.draw(this.buffer.size / vertexStruct.struct.size)
                }
            })
        })
    }

    resize() {
        const scale = this.projectionMatrix[1][1];
        this.projectionMatrix = projection.matrix(scale, this.canvas.element.width / this.canvas.element.height);
        this.canvas.resize()
        this.depthTexture.size = this.canvas.size
    }

    get projectionMatrix(): aether.Mat4 {
        return this.uniformsBuffer.get(uniformsStruct.members.matProjection)
    }

    set projectionMatrix(value: aether.Mat4) {
        this.uniformsBuffer.set(uniformsStruct.members.matProjection, value);
    }

    get viewMatrix(): aether.Mat4 {
        return this.uniformsBuffer.get(uniformsStruct.members.matView)
    }

    set viewMatrix(value: aether.Mat4) {
        this.uniformsBuffer.set(uniformsStruct.members.matView, value);
    }

    get modelMatrix(): aether.Mat4 {
        return this.uniformsBuffer.get(uniformsStruct.members.matModel)
    }

    set modelMatrix(value: aether.Mat4) {
        this.uniformsBuffer.set(uniformsStruct.members.matModel, value);
    }

    get matrices(): aether.Mat4[] {
        return this._matrices
    }

    set matrices(value: aether.Mat4[]) {
        this._matrices = value
        this.matricesBuffer.setData(matricesStruct.view(value))
        this.matricesGroup = this.newMatricesGroup()
    }

    get color(): aether.Vec3 {
        return this.uniformsBuffer.get(uniformsStruct.members.color)
    }

    set color(value: aether.Vec3) {
        this.uniformsBuffer.set(uniformsStruct.members.color, value);
    }

    get lightPosition(): aether.Vec3 {
        return this.uniformsBuffer.get(uniformsStruct.members.lightPosition)
    }

    set lightPosition(value: aether.Vec3) {
        this.uniformsBuffer.set(uniformsStruct.members.lightPosition, value);
    }

    get twist(): number {
        return this.uniformsBuffer.get(uniformsStruct.members.twist)
    }

    set twist(value: number) {
        this.uniformsBuffer.set(uniformsStruct.members.twist, value);
    }

    get shininess(): number {
        return this.uniformsBuffer.get(uniformsStruct.members.shininess)
    }

    set shininess(value: number) {
        this.uniformsBuffer.set(uniformsStruct.members.shininess, value);
    }

    get fogginess(): number {
        return this.uniformsBuffer.get(uniformsStruct.members.fogginess)
    }

    set fogginess(value: number) {
        this.uniformsBuffer.set(uniformsStruct.members.fogginess, value);
    }

}

function cone(radiusTop: number, radiusBottom: number, height: number, stacks: number, slices: number) {
    const slope = (radiusTop - radiusBottom) / height;
    const result: number[] = [];
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j <= slices; j++) {
            const y1 = height * (i / stacks);
            const y2 = height * ((i + 1) / stacks);
            const r1 = radiusBottom + slope * y1;
            const r2 = radiusBottom + slope * y2;
            const z = Math.cos(2 * Math.PI * j / slices);
            const x = Math.sin(2 * Math.PI * j / slices);

            const n = aether.vec3.unit([x, slope, z]);
            result.push(
                x * r2, y2, z * r2, ...n,
                x * r1, y1, z * r1, ...n
            );
        }
    }
    return result;
}

export async function view(canvasId: string) {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "tree.vert",
        fragmentShaderCode: "tree.frag"
    }, "/shaders")
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    const webgpuAPI = glWebGPU(canvas)
    const device = await gpu.Device.instance({}, webgpuAPI)
    const vertexShader = await device.shaderModule({ code: shaders.vertexShaderCode }) 
    const fragmentShader = await device.shaderModule({ code: shaders.fragmentShaderCode }) 
    return new View(device.canvas(canvas, 4), device, vertexShader, fragmentShader);
}