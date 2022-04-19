var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from "../djee/gpu/index.js";
import * as misc from "../utils/misc.js";
export function init() {
    window.onload = doInit;
}
const SEEDS_COUNT = 0x4000;
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpuDevice();
        const canvas = device.canvas("canvas", false);
        const shaderModule = yield device.loadShaderModule("noise.wgsl");
        const pipeline = device.device.createRenderPipeline({
            vertex: shaderModule.vertexState("v_main", []),
            fragment: shaderModule.fragmentState("f_main", [
                canvas
            ]),
            multisample: canvas.multiSampleState(),
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: "uint32"
            }
        });
        const uniformsBuffer = createUniformsBuffer(canvas);
        const rngSeedsBuffer = createRNGSeedsBuffer(device);
        const bindGroup = device.createBindGroup(pipeline.getBindGroupLayout(0), [uniformsBuffer]);
        const draw = () => {
            device.enqueueCommand(encoding => {
                encoding.renderPass({ colorAttachments: [canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })] }, pass => {
                    pass.setBindGroup(0, bindGroup);
                    pass.setPipeline(pipeline);
                    pass.draw(4);
                });
                uniformsBuffer.copyingAt(0, rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoding);
                uniformsBuffer.copyingAt(4, rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoding);
                uniformsBuffer.copyingAt(8, rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoding);
                uniformsBuffer.copyingAt(12, rngSeedsBuffer, randomSeedOffset(), Uint32Array.BYTES_PER_ELEMENT)(encoding);
            });
        };
        const freqWatch = misc.required(document.getElementById("freq-watch"));
        const freqMeter = new misc.FrequencyMeter(1000, freq => freqWatch.innerText = freq.toPrecision(4));
        const frame = (t) => {
            draw();
            requestAnimationFrame(frame);
            freqMeter.tick(t);
        };
        requestAnimationFrame(frame);
    });
}
function gpuDevice() {
    return __awaiter(this, void 0, void 0, function* () {
        const gpuStatus = misc.required(document.getElementById("gpu-status"));
        try {
            const device = yield gpu.Device.instance();
            gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}";
            return device;
        }
        catch (e) {
            gpuStatus.innerHTML = "\u{1F62D} Not Supported!";
            throw e;
        }
    });
}
function createUniformsBuffer(canvas) {
    const struct = gpu.struct({
        randomSeed: gpu.u32.x4,
        width: gpu.u32,
        sampleCount: gpu.u32,
    });
    const dataView = struct.view([{
            randomSeed: [random(), random(), random(), random()],
            width: canvas.size.width,
            sampleCount: canvas.sampleCount,
        }]);
    return canvas.device.buffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, dataView);
}
function createRNGSeedsBuffer(device) {
    const seeds = [];
    for (let i = 0; i < SEEDS_COUNT; i++) {
        seeds.push(random());
    }
    const dataView = gpu.u32.view(seeds);
    return device.buffer(GPUBufferUsage.COPY_SRC, dataView);
}
function random() {
    return Math.round(Math.random() * 0xFFFFFFFF) | 1;
}
function randomSeedOffset() {
    return Math.floor(Math.random() * SEEDS_COUNT) * Uint32Array.BYTES_PER_ELEMENT;
}
//# sourceMappingURL=toy.js.map