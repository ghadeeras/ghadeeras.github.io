import * as gpu from "../djee/gpu/index.js"
import * as aether from "/aether/latest/index.js"
import * as gear from "/gear/latest/index.js"
import * as misc from "../utils/misc.js"
import { RotationDragging } from "../utils/dragging.js"
import { Integrator } from "./integrator.js"
import { Tracer, VolumeStruct } from "./tracer.js"
import { Scene } from "./scene.js"

export function init() {
    window.onload = doInit
}

async function doInit() {
    const scene = new Scene(64)
    setup(scene)

    const device = await gpuDevice()
    const canvas = device.canvas("canvas", false)

    const tracer = await Tracer.create(device, canvas, scene)
    const integrator = await Integrator.create(device, canvas)

    const speed = [0]
    const samplesPerPixelElement = misc.required(document.getElementById("spp"))
    const layersCountElement = misc.required(document.getElementById("layers"))
    const handleKey = (key: string, ctrl: boolean) => {
        if (!ctrl && '0' <= key && key <= '9') {
            const power = Number.parseInt(key)
            tracer.samplesPerPixel = 2 ** power
            samplesPerPixelElement.innerText = tracer.samplesPerPixel.toString()
            return true
        }
        if (ctrl && '0' <= key && key <= '8') {
            const power = Number.parseInt(key)
            integrator.layersCount = 2 ** power
            layersCountElement.innerText = integrator.layersCount.toString()
            return true
        }
        if (key == 'w' || key == 's') {
            speed[0] = 0.0
            console.log(tracer.position)
            return true
        }
    }
    window.onkeyup = e => {
        if (handleKey(e.key.toLowerCase(), e.ctrlKey)) {
            e.preventDefault()
        }
    }
    window.onkeydown = e => {
        const key = e.key.toLowerCase()
        if (key == 'w') {
            e.preventDefault()
            speed[0] = -0.2
        }
        if (key == 's') {
            e.preventDefault()
            speed[0] = 0.2
        }
    }

    canvas.element.onwheel = e => {
        e.preventDefault()
        const m = aether.mat3.transpose(tracer.matrix)
        tracer.focalRatio *= Math.exp(-Math.sign(e.deltaY) * 0.25)
    }

    gear.ElementEvents.create(canvas.element.id).dragging.value
        .then(gear.drag(new RotationDragging(() => aether.mat4.cast(tracer.matrix), () => aether.mat4.projection(1, Math.SQRT2))))
        .attach(m => {
            tracer.matrix = aether.mat3.from([
                ...aether.vec3.swizzle(m[0], 0, 1, 2),
                ...aether.vec3.swizzle(m[1], 0, 1, 2),
                ...aether.vec3.swizzle(m[2], 0, 1, 2),
            ])
        })

    handleKey('4', false)
    handleKey('4', true)
    tracer.position = [36, 36, 36]

    const draw = () => {
        device.enqueueCommand(encoder => {
            tracer.encode(encoder, integrator.colorAttachment({ r: 0, g: 0, b: 0, a: 1}))
            integrator.encode(encoder)
        })
        if (speed[0] !== 0) {
            const m = aether.mat3.transpose(tracer.matrix)
            tracer.position = aether.vec3.add(
                tracer.position,
                aether.vec3.scale(m[2], speed[0])
            )
        }
    }
    
    const freqMeter = misc.FrequencyMeter.create(1000, "freq-watch")
    freqMeter.animateForever(draw)

}

async function gpuDevice() {
    const gpuStatus = misc.required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}

function setup(scene: Scene) {
    scene.material([0.6, 0.9, 0.3, 1])
    scene.material([0.3, 0.6, 0.9, 1])
    scene.material([0.9, 0.3, 0.6, 1])
    scene.material([0.5, 0.5, 0.5, 1])
    populateGrid(scene)
}

function populateGrid(scene: Scene) {
    scene.box([ 0,  0,  0], [64, 64,  1], 3)
    scene.box([ 0,  0,  0], [64,  1, 64], 3)
    scene.box([ 0,  0,  0], [ 1, 64, 64], 3)
    scene.box([ 0,  0, 63], [64, 64, 64], 3)
    scene.box([ 0, 63,  0], [64, 64, 64], 3)
    scene.box([63,  0,  0], [64, 64, 64], 3)
    for (let x = 0; x < scene.gridSize; x += 8) {
        for (let y = 0; y < scene.gridSize; y += 8) {
            for (let z = 0; z < scene.gridSize; z += 8) {
                for (let orientation = 0; orientation < 3; orientation++) {
                    addWall(scene, [x, y, z], orientation)
                }
            }
        }
    }
}

function addWall(scene: Scene, pos: aether.Vec3, orientation: number) {
    const config = Math.floor((pos[0] / 8 + pos[1] / 8 + pos[2] / 8) % 3)
    const volumes: VolumeStruct[] = [
        { min: [0.0, 0.0, 0.0], max: [4.0, 4.0, 1.0] },
        { min: [4.0, 0.0, 0.0], max: [8.0, 4.0, 1.0] },
        { min: [0.0, 4.0, 0.0], max: [4.0, 8.0, 1.0] },
    ]
    switch (config) {
        case 1: volumes.forEach(({min, max}) => { 
            const t = max[0]
            max[0] = 8 - min[0] 
            min[0] = 8 - t 
        }); break
        case 2: volumes.forEach(({min, max}) => { 
            const t = max[1]
            max[1] = 8 - min[1] 
            min[1] = 8 - t 
        }); break
    }
    switch (orientation) {
        case 1: volumes.forEach(v => {
            v.min = aether.vec3.swizzle(v.min, 1, 2, 0)
            v.max = aether.vec3.swizzle(v.max, 1, 2, 0)
        }); break
        case 2: volumes.forEach(v => {
            v.min = aether.vec3.swizzle(v.min, 2, 0, 1)
            v.max = aether.vec3.swizzle(v.max, 2, 0, 1)
        }); break
    }
    volumes.forEach(v => {
        scene.box(aether.vec3.add(pos, v.min), aether.vec3.add(pos, v.max), orientation)
    }) 
}