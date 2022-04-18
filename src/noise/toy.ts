import * as gpu from "../djee/gpu/index.js"
import { required } from "../utils/misc.js"

export function init() {
    window.onload = doInit
}

async function doInit() {
    const device = await gpuDevice()
    const canvas = device.canvas("canvas", false)

    const fragmentCount = canvas.size.width * (canvas.size.height ?? canvas.size.width) * canvas.sampleCount

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
        }
    })

    console.log(`Initializing ${fragmentCount} fragment RNGs ...`)

    const canvasStruct = gpu.struct({
        width: gpu.u32,
        sampleCount: gpu.u32,
    })

    const rngStruct = gpu.struct({
        seed: gpu.u32.times(5),
        counter: gpu.u32,
    })

    const canvasData = canvasStruct.view([{
        width: canvas.size.width,
        sampleCount: canvas.sampleCount,
    }])

    const rngArray: gpu.DataTypeOf<typeof rngStruct>[] = []
    for (let i = 0; i < fragmentCount; i++) {
        rngArray.push({
            seed: [random(), random(), random(), random(), random()],
            counter: random(),
        })
    }
    const rngArrayData = rngStruct.view(rngArray)
    
    console.log("Done!")

    const canvasBuffer = device.buffer(GPUBufferUsage.UNIFORM, canvasData)
    const rngArrayBuffer = device.buffer(GPUBufferUsage.STORAGE, rngArrayData)

    const bindGroup = device.createBindGroup(pipeline.getBindGroupLayout(0), [canvasBuffer, rngArrayBuffer])

    const draw = () => {
        device.enqueueCommand(encoding => {
            encoding.renderPass({ colorAttachments: [canvas.attachment({r: 1, g: 1, b: 1, a: 1})] }, pass => {
                pass.setBindGroup(0, bindGroup)
                pass.setPipeline(pipeline)
                pass.draw(4)
            })
        })
    }
    
    const performance = {
        frames: 0,
        time: 0
    }
    const frame = (t: number) => {
        draw();
        requestAnimationFrame(frame)
        if (performance.time === 0) {
            performance.time = t
        }
        performance.frames++
        const elapsedTime = t - performance.time
        if (elapsedTime >= 10000) {
            console.log(`FPS: ${performance.frames * 1000 / elapsedTime}`)
            performance.frames = 0
            performance.time = t
        }
    }

    requestAnimationFrame(frame)
}

function random(): number {
    return Math.round(Math.random() * 0xFFFFFFFF);
}

async function gpuDevice() {
    const gpuStatus = required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}
