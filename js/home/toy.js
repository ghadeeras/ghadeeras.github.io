import { gpu, wgl } from "lumen";
import * as gear from "gear";
import { glWebGPU } from "webgxx";
const mySketch = new Image();
const uniformsStruct = gpu.struct({
    effect: gpu.u32,
    mousePos: gpu.f32.x2,
});
function property(buffer, type) {
    return {
        getter: () => buffer.get(type),
        setter: (value) => buffer.set(type, value)
    };
}
export async function init() {
    const vertexShaderCode = wgl.vertexShaders.fullScreenPass;
    const fragmentShaderCode = await gear.fetchTextFile("/shaders/home.frag");
    const canvasElement = document.getElementById("canvas");
    const webgpuAPI = glWebGPU(canvasElement);
    const device = await gpu.Device.instance({}, webgpuAPI);
    const canvas = device.canvas(canvasElement);
    const vertexShader = await device.shaderModule({ code: vertexShaderCode });
    const fragmentShader = await device.shaderModule({ code: wgl.fragmentShaders.fullScreenPass(fragmentShaderCode) });
    const pipeline = device.wrapped.createRenderPipeline({
        layout: "auto",
        vertex: vertexShader.vertexState("main", []),
        fragment: fragmentShader.fragmentState("main", [canvas])
    });
    const uniformsBuffer = device.syncBuffer({
        usage: ["UNIFORM"],
        data: uniformsStruct.view([{
                effect: 0,
                mousePos: [0x10000, 0x10000]
            }])
    });
    const texture = device.texture({
        format: canvas.format,
        size: canvas.size,
        usage: GPUTextureUsage.TEXTURE_BINDING
    });
    const sampler = device.sampler({
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear"
    });
    const bindGroup = device.wrapped.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
                binding: 0,
                resource: uniformsBuffer.asBindingResource()
            }, {
                binding: 1,
                resource: texture.asBindingResource()
            }, {
                binding: 2,
                resource: sampler.asBindingResource()
            }]
    });
    const toy = {
        device,
        canvas,
        pipeline,
        bindGroup,
        uniformsBuffer,
        texture,
        effect: property(uniformsBuffer, uniformsStruct.members.effect),
        mousePos: property(uniformsBuffer, uniformsStruct.members.mousePos),
    };
    mySketch.onload = () => {
        updateTexture(toy);
        frame();
    };
    mySketch.src = "/MySketch.png";
    canvas.element.ontouchmove = event => event.preventDefault();
    canvas.element.onpointermove = event => distortImage(event, toy);
    canvas.element.onpointerleave = () => restoreImage(toy);
    canvas.element.onclick = event => useCurrentImage(event, toy);
    canvas.element.ondblclick = event => restoreOriginalImage(event, toy);
    canvas.element.ondragover = event => tearImage(event, toy);
    canvas.element.ondrop = event => loadImage(event, toy);
    const frame = () => {
        draw(toy);
        requestAnimationFrame(frame);
    };
}
function draw(toy) {
    requestAnimationFrame(() => {
        toy.device.enqueueCommands("draw", encoder => {
            encoder.renderPass({
                colorAttachments: [toy.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })]
            }, pass => {
                pass.setPipeline(toy.pipeline);
                pass.setBindGroup(0, toy.bindGroup);
                pass.draw(3);
            });
        });
    });
}
async function updateTexture(toy) {
    const imageBitmap = await createImageBitmap(mySketch, {
        resizeWidth: toy.texture.size.width,
        resizeHeight: toy.texture.size.height
    });
    toy.texture.device.wrapped.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: toy.texture.wrapped }, [imageBitmap.width, imageBitmap.height]);
}
async function useCurrentImage(e, toy) {
    distortImage(e, toy);
    const imageBitmap = await createImageBitmap(toy.canvas.element);
    toy.texture.device.wrapped.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: toy.texture.wrapped }, [imageBitmap.width, imageBitmap.height]);
}
function distortImage(e, toy) {
    e.preventDefault();
    toy.mousePos.setter(normalizePosition(e));
}
function restoreImage(toy) {
    toy.mousePos.setter([0x10000, 0x10000]);
    toy.effect.setter((toy.effect.getter() + 1) % 3);
}
function restoreOriginalImage(e, toy) {
    e.preventDefault();
    updateTexture(toy);
}
function tearImage(e, toy) {
    e.preventDefault();
    toy.mousePos.setter(normalizePosition(e));
    if (toy.effect.getter() < 3) {
        toy.effect.setter(toy.effect.getter() + 3);
    }
}
function loadImage(e, toy) {
    e.preventDefault();
    toy.effect.setter(toy.effect.getter() - 3);
    if (e.dataTransfer) {
        const item = e.dataTransfer.items[0];
        if (item.kind == 'file') {
            const url = URL.createObjectURL(gear.required(item.getAsFile()));
            mySketch.src = url;
        }
        else {
            item.getAsString(url => {
                mySketch.crossOrigin = isCrossOrigin(url) ? "anonymous" : null;
                mySketch.src = url;
            });
        }
    }
}
function isCrossOrigin(url) {
    const urlObj = new URL(url, window.location.href);
    const isCrossOrigin = urlObj.origin != window.location.origin;
    return isCrossOrigin;
}
function normalizePosition(e) {
    const canvas = e.target;
    return [
        (2 * e.offsetX - canvas.clientWidth) / canvas.clientWidth,
        (canvas.clientHeight - 2 * e.offsetY) / canvas.clientHeight
    ];
}
//# sourceMappingURL=toy.js.map