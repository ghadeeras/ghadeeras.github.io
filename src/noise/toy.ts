import { gpu } from "lumen"
import * as gear from "gear"

export function init() {
    window.onload = doInit
}

const uniformsStruct = gpu.struct({
    samplesPerPixel: gpu.u32,
})

async function doInit() {
    const device = await gpuDevice()
    const canvas = device.canvas("canvas")

    const shaderModule = await device.loadShaderModule("noise.wgsl")
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
    })

    const uniformsBuffer = createUniformsBuffer(device)
    const clockBuffer = createClockBuffer(device)
    const bindGroup = device.bindGroup(pipeline.getBindGroupLayout(0), [uniformsBuffer, clockBuffer])

    const samplesPerPixelElement = gear.required(document.getElementById("spp"))
    window.onkeyup = e => {
        const key = e.key.toLowerCase()
        if ('0' <= key && key <= '9') {
            const power = Number.parseInt(key)
            const spp = 2 ** power
            uniformsBuffer.writeAt(uniformsStruct.members.samplesPerPixel.offset, gpu.u32.view([spp]))
            samplesPerPixelElement.innerText = spp.toString()
        }
    }

    const draw = () => {
        device.enqueueCommand("render", encoding => {
            encoding.renderPass({ colorAttachments: [canvas.attachment({r: 1, g: 1, b: 1, a: 1})] }, pass => {
                pass.setBindGroup(0, bindGroup)
                pass.setPipeline(pipeline)
                pass.draw(4)
            })
        })
    }
    
    const freqWatch = gear.required(document.getElementById("freq-watch"))
    const freqMeter = new gear.loops.FrequencyMeter(1000, freq => freqWatch.innerText = freq.toPrecision(4))
    const frame = (t: number) => {
        draw();
        requestAnimationFrame(frame)
        freqMeter.tick(t)
    }

    requestAnimationFrame(frame)

}

async function gpuDevice() {
    const gpuStatus = gear.required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}

function createUniformsBuffer(device: gpu.Device) {
    const dataView = uniformsStruct.view([{
        samplesPerPixel: 1,
    }])

    return device.buffer("uniforms", GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, dataView)
}

function createClockBuffer(device: gpu.Device) {
    const dataView = gpu.u32.view([0])
    return device.buffer("clock", GPUBufferUsage.STORAGE, dataView)
}
