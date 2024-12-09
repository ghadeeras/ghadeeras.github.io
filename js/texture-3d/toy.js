import * as gear from "gear";
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/texture-3d/toy.ts";
export const huds = {};
export async function init() {
    const canvas = required(document.getElementById("canvas"));
    let canvasManager = new gear.loops.CanvasSizeManager();
    const gpu = navigator.gpu;
    const gpuAdapter = required(await gpu.requestAdapter());
    const gpuDevice = required(await gpuAdapter.requestDevice());
    const gpuContext = required(canvas.getContext("webgpu"));
    const canvasConfig = {
        device: gpuDevice,
        format: gpu.getPreferredCanvasFormat(),
    };
    gpuContext.configure(canvasConfig);
    const texture3D = gpuDevice.createTexture({
        dimension: "3d",
        format: "rgba16float",
        size: { width: 16, height: 16, depthOrArrayLayers: 16 },
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const texture3DComputer = new Texture3DComputer(gpuDevice, texture3D);
    const renderer = new Renderer(gpuDevice, canvasConfig.format, texture3D);
    canvasManager.observe(canvas, c => renderer.setAspectRatio(c.width / c.height));
    texture3DComputer.computeTexture3D();
    startAnimation(renderer, gpuContext);
}
function startAnimation(renderer, gpuContext) {
    const startTime = [null];
    const frame = (time) => {
        requestAnimationFrame(frame);
        if (startTime[0] === null) {
            startTime[0] = time;
        }
        const elapsedTime = time - startTime[0];
        renderer.renderTo(gpuContext.getCurrentTexture(), elapsedTime);
    };
    requestAnimationFrame(frame);
}
class Renderer {
    constructor(gpuDevice, format, texture3D) {
        this.gpuDevice = gpuDevice;
        const groupLayout = this.createBindGroupLayout();
        this.renderPipeline = this.createRenderPipeline(groupLayout, format);
        this.uniforms = this.createUniforms();
        this.bindGroup = this.createBindGroup(groupLayout, texture3D);
    }
    createBindGroupLayout() {
        return this.gpuDevice.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { viewDimension: "3d" },
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: "filtering" }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform",
                        minBindingSize: 4,
                    }
                }]
        });
    }
    createRenderPipeline(groupLayout, format) {
        const renderingShader = this.gpuDevice.createShaderModule({
            code: renderingShaderCode
        });
        return this.gpuDevice.createRenderPipeline({
            layout: this.gpuDevice.createPipelineLayout({
                bindGroupLayouts: [groupLayout]
            }),
            vertex: { module: renderingShader },
            fragment: {
                module: renderingShader,
                targets: [{
                        format: format,
                        blend: {
                            color: {
                                operation: "add",
                                srcFactor: "one",
                                dstFactor: "one",
                            },
                            alpha: {},
                        }
                    }],
            },
            primitive: {
                topology: "line-list"
            },
        });
    }
    createUniforms() {
        return this.gpuDevice.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });
    }
    createBindGroup(textureGroupLayout, texture3D) {
        const sampler = this.gpuDevice.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            addressModeW: "clamp-to-edge",
            minFilter: "linear",
            magFilter: "linear",
        });
        return this.gpuDevice.createBindGroup({
            layout: textureGroupLayout,
            entries: [{
                    binding: 0,
                    resource: texture3D.createView(),
                }, {
                    binding: 1,
                    resource: sampler
                }, {
                    binding: 2,
                    resource: { buffer: this.uniforms }
                }],
        });
    }
    async setAspectRatio(value) {
        this.gpuDevice.queue.writeBuffer(this.uniforms, 0, new Float32Array([value]));
    }
    renderTo(texture, elapsedTime) {
        const encoder = this.gpuDevice.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                    view: texture.createView(),
                    loadOp: "clear",
                    storeOp: "store",
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                }],
        });
        pass.setPipeline(this.renderPipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.draw(17 * 17 * 2, 3, 0, Math.round(elapsedTime) % 36000);
        pass.end();
        this.gpuDevice.queue.submit([encoder.finish()]);
    }
}
class Texture3DComputer {
    constructor(gpuDevice, texture3D) {
        this.gpuDevice = gpuDevice;
        const textureStorageGroupLayout = this.createTextureStorageGroupLayout(gpuDevice);
        this.computePipeline = this.createComputePipeline(textureStorageGroupLayout);
        this.textureStorageGroup = this.createTextureStorageGroup(textureStorageGroupLayout, texture3D);
    }
    createTextureStorageGroupLayout(gpuDevice) {
        return gpuDevice.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        viewDimension: "3d",
                        format: "rgba16float",
                    }
                }]
        });
    }
    createComputePipeline(textureStorageGroupLayout) {
        const texture3DComputeShader = this.gpuDevice.createShaderModule({
            code: texture3DComputeShaderCode
        });
        return this.gpuDevice.createComputePipeline({
            compute: { module: texture3DComputeShader },
            layout: this.gpuDevice.createPipelineLayout({
                bindGroupLayouts: [textureStorageGroupLayout]
            })
        });
    }
    createTextureStorageGroup(textureStorageGroupLayout, texture3D) {
        return this.gpuDevice.createBindGroup({
            layout: textureStorageGroupLayout,
            entries: [{
                    binding: 0,
                    resource: texture3D.createView(),
                }]
        });
    }
    computeTexture3D() {
        const encoder = this.gpuDevice.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.computePipeline);
        pass.setBindGroup(0, this.textureStorageGroup);
        pass.dispatchWorkgroups(4, 4, 4);
        pass.end();
        this.gpuDevice.queue.submit([encoder.finish()]);
    }
}
function required(value) {
    if (!value) {
        throw "Required value is undefined or null";
    }
    return value;
}
const renderingShaderCode = /*wgsl*/ `

    struct Uniforms {
        focal_ratio: f32, 
    }

    struct Vertex {
        @builtin(vertex_index) vertex_index: u32, 
        @builtin(instance_index) instance_index: u32,
    }

    struct Position {
        @builtin(position) position: vec4<f32>,
        @location(0) model_position: vec4<f32>,
    }

    struct Fragment {
        @location(0) color: vec4<f32> 
    }

    @group(0)
    @binding(2)
    var<uniform> uniforms: Uniforms;

    @vertex
    fn v_main(vertex: Vertex) -> Position {
        let time = f32(vertex.instance_index) / 18000;
        let proj_mat = calc_proj_mat(uniforms.focal_ratio);
        let view_mat = calc_view_mat(time);
        let model_position = calc_model_pos(vertex);
        let position = proj_mat * view_mat * model_position;
        return Position(position, model_position);
    }

    @group(0)
    @binding(0)
    var texture: texture_3d<f32>;

    @group(0)
    @binding(1)
    var texture_sampler: sampler;

    @fragment
    fn f_main(position: Position) -> Fragment {
        // Comment the following line, and uncomment the one after to see how the object should be rendered with colors
        return Fragment(textureSample(texture, texture_sampler, 0.5 * (position.model_position.xyz + 1.0)));
        // return Fragment(position.model_position * position.model_position * vec4(vec3(0.5), 1.0));
    }

    fn calc_proj_mat(ar: f32) -> mat4x4<f32> {
        let n =   1.0;
        let f = 100.0;
        let p = f * n;
        let r = f - n;
        return mat4x4(
            1.0, 0.0,   0.0,  0.0,
            0.0,  ar,   0.0,  0.0,
            0.0, 0.0, n / r, -1.0,
            0.0, 0.0, p / r,  0.0
        );
    }

    fn calc_view_mat(t: f32) -> mat4x4<f32> {
        let a = t * atan2(0.0, -1.0);
        return mat4x4(
             cos(a), 0.0, sin(a), 0.0,
                0.0, 1.0,    0.0, 0.0,
            -sin(a), 0.0, cos(a), 0.0,
                0.0, 0.0,   -4.0, 1.0
        );
    }

    fn calc_model_pos(vertex: Vertex) -> vec4<f32> {
        let z = 2.0 * f32( vertex.vertex_index       %  2)        - 1;
        let y = 2.0 * f32((vertex.vertex_index /  2) % 17) / 16.0 - 1;
        let x = 2.0 * f32((vertex.vertex_index / 34) % 17) / 16.0 - 1;

        let i = vertex.instance_index % 3;
        let pos = vec4(x, y, z, 1.0);
        return select(
            select(
                vec4(pos.y, pos.z, pos.x, 1.0), 
                vec4(pos.z, pos.x, pos.y, 1.0), 
                i == 1
            ), 
            pos, 
            i == 0
        );
    }

`;
const texture3DComputeShaderCode = /*wgsl*/ `
    @group(0)
    @binding(0)
    var texture_storage: texture_storage_3d<rgba16float, write>;

    @compute
    @workgroup_size(4, 4, 4)
    fn c_main(@builtin(global_invocation_id) global_invocation_id: vec3<u32>) {
        let pos = vec3<f32>(global_invocation_id) / 8.0 - 1.0;
        let color = vec4(pos * pos * 0.5, 1.0);
        textureStore(texture_storage, global_invocation_id, color);
    }

`;
//# sourceMappingURL=toy.js.map