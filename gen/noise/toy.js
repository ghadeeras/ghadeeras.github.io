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
const uniformsStruct = gpu.struct({
    samplesPerPixel: gpu.u32,
});
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
            },
            layout: "auto"
        });
        const uniformsBuffer = createUniformsBuffer(device);
        const clockBuffer = createClockBuffer(device);
        const bindGroup = device.bindGroup(pipeline.getBindGroupLayout(0), [uniformsBuffer, clockBuffer]);
        const samplesPerPixelElement = misc.required(document.getElementById("spp"));
        window.onkeyup = e => {
            const key = e.key.toLowerCase();
            if ('0' <= key && key <= '9') {
                const power = Number.parseInt(key);
                const spp = Math.pow(2, power);
                uniformsBuffer.writeAt(uniformsStruct.members.samplesPerPixel.offset, gpu.u32.view([spp]));
                samplesPerPixelElement.innerText = spp.toString();
            }
        };
        const draw = () => {
            device.enqueueCommand("render", encoding => {
                encoding.renderPass({ colorAttachments: [canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })] }, pass => {
                    pass.setBindGroup(0, bindGroup);
                    pass.setPipeline(pipeline);
                    pass.draw(4);
                });
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
function createUniformsBuffer(device) {
    const dataView = uniformsStruct.view([{
            samplesPerPixel: 1,
        }]);
    return device.buffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, dataView);
}
function createClockBuffer(device) {
    const dataView = gpu.u32.view([0]);
    return device.buffer("clock", GPUBufferUsage.STORAGE, dataView);
}
//# sourceMappingURL=toy.js.map