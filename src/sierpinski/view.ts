import * as gear from "gear"
import * as gpu from "lumen"
import { FlattenedSierpinski } from "./model.js"
import { glWebGPU } from "webgxx";

const vertexShaderCode = /*glsl*/`
    layout(location = 0) in vec2 vPosition;
    
    uniform U_0_0 {
        float twist;
        float scale;
    };
    
    void main() {
        vec2 p = scale * vPosition;
        float angle = twist * length(vPosition);
        float s = sin(angle);
        float c = cos(angle);
        mat2 rotation = mat2(vec2(c, s), vec2(-s, c));
        gl_Position = vec4(rotation * p, 0.0, 1.0);
    }
`;

const fragmentShaderCode = /*glsl*/`
    layout(location = 0) out vec4 fragColor;

    void main() {
        fragColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
`

const uniformsStruct = gpu.struct({
    twist: gpu.f32,
    scale: gpu.f32,
})

const vertexStruct = gpu.vertex({ _: gpu.f32.x2 });
export class View {
    
    private readonly uniformsBuffer: gpu.SyncBuffer;
    private readonly uniformsGroup: GPUBindGroup;
    private readonly pipeline: GPURenderPipeline;

    private readonly cornersBuffer: gpu.DataBuffer;
    private readonly centersBuffer: gpu.DataBuffer;
    private vertexCount = { centers: 0, corners: 0 }

    private mustShowCorners = true;
    private mustShowCenters = true;

    private depthElement: HTMLElement
    private twistElement: HTMLElement
    private scaleElement: HTMLElement

    constructor(
        private readonly device: gpu.Device,
        private readonly canvas: gpu.Canvas, 
        vertexShader: gpu.ShaderModule,
        fragmentShader: gpu.ShaderModule,
        depthId: string, 
        twistId: string, 
        scaleId: string,
    ) {
        this.pipeline = device.wrapped.createRenderPipeline({
            layout: "auto",
            vertex: vertexShader.vertexState("main", [
                vertexStruct.asBufferLayout()
            ]),
            fragment: fragmentShader.fragmentState("main", [{
                format: canvas.format
            }])
        })

        this.uniformsBuffer = device.syncBuffer({
            usage: ["UNIFORM"],
            data: uniformsStruct.view([{
                twist: 0,
                scale: 1 
            }])
        })
        this.uniformsGroup = device.wrapped.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: this.uniformsBuffer.gpuBuffer.wrapped
            }]
        })

        this.cornersBuffer = device.dataBuffer({
            usage: ["VERTEX"],
            size: gpu.f32.x2.size * 9,
        });
        this.centersBuffer = device.dataBuffer({
            usage: ["VERTEX"],
            size: gpu.f32.x2.size * 3,
        });


        this.depthElement = gear.htmlElement(depthId)
        this.twistElement = gear.htmlElement(twistId)
        this.scaleElement = gear.htmlElement(scaleId)
    }

    static async create(canvasId: string, depthId: string, twistId: string, scaleId: string) {
        const canvasElement = document.getElementById(canvasId) as HTMLCanvasElement
        const webgpuAPI = glWebGPU(canvasElement)
        const device = await gpu.Device.instance({}, webgpuAPI)
        const canvas = device.canvas(canvasElement, 4)
        const vertexShader = await device.shaderModule({ code: vertexShaderCode });
        const fragmentShader = await device.shaderModule({ code: fragmentShaderCode });
        return new View(device, canvas, vertexShader, fragmentShader, depthId, twistId, scaleId)
    }

    setSierpinski(flattenedSierpinski: FlattenedSierpinski) {
        this.cornersBuffer.setData(new DataView(new Float32Array(flattenedSierpinski.corners).buffer));
        this.centersBuffer.setData(new DataView(new Float32Array(flattenedSierpinski.centers).buffer));
        this.vertexCount = { 
            corners: flattenedSierpinski.corners.length / flattenedSierpinski.stride ,
            centers: flattenedSierpinski.centers.length / flattenedSierpinski.stride ,
        }
        this.depthElement.innerText = flattenedSierpinski.depth.toFixed(0)
    }
    
    get twist() {
        return this.uniformsBuffer.get(uniformsStruct.members.twist);
    }

    set twist(twist: number) {
        this.uniformsBuffer.set(uniformsStruct.members.twist, twist);
        this.twistElement.innerText = twist.toFixed(3)
    }

    get scale() {
        return this.uniformsBuffer.get(uniformsStruct.members.scale);
    }

    set scale(scale: number) {
        this.uniformsBuffer.set(uniformsStruct.members.scale, scale);
        this.scaleElement.innerText = scale.toFixed(3)
    }

    setShowCorners(showCorners: boolean) {
        this.mustShowCorners = showCorners
    }

    setShowCenters(showCenters: boolean) {
        this.mustShowCenters = showCenters
    }

    draw() {
        this.device.enqueueCommands("draw", encoder => {
            encoder.renderPass({ 
                colorAttachments: [ this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 }) ] 
            }, pass => {
                pass.setPipeline(this.pipeline)
                pass.setBindGroup(0, this.uniformsGroup)
                if (this.mustShowCorners) {
                    pass.setVertexBuffer(0, this.cornersBuffer.wrapped)
                    pass.draw(this.vertexCount.corners)
                }
                if (this.mustShowCenters) {
                    pass.setVertexBuffer(0, this.centersBuffer.wrapped)
                    pass.draw(this.vertexCount.centers)
                }
            })
        })
    }

}